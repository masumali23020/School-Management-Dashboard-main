import type {
  AdmissionApplicationStatus,
  AdmissionPaymentStatus,
  Prisma,
} from "@prisma/client";
import { nanoid } from "nanoid";
import prisma from "@/lib/db";
import { countInvoicesForSchoolYear } from "@/lib/admission/invoice.service";

export type ActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
  error?: boolean;
};

export async function getSchoolIdFromSlug(slug: string): Promise<number | null> {
  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!school || !school.isActive) return null;
  return school.id;
}

export async function generateApplicationNumber(
  tx: Prisma.TransactionClient,
  schoolId: number,
  academicYear: string
): Promise<string> {
  const setting = await tx.admissionSetting.findUnique({ where: { schoolId } });
  const prefix = setting?.applicationPrefix ?? "ADM";
  const count = await tx.admissionApplication.count({
    where: { schoolId, admissionSession: { academicYear } },
  });
  return `${prefix}-${academicYear}-${String(count + 1).padStart(6, "0")}`;
}

export function generateVerificationCode(): string {
  return nanoid(24);
}

export async function generateInvoiceNumber(
  tx: Prisma.TransactionClient,
  schoolId: number,
  academicYear: string
): Promise<string> {
  const setting = await tx.admissionSetting.findUnique({ where: { schoolId } });
  const prefix = setting?.invoicePrefix ?? "INV-ADM";
  const count = await countInvoicesForSchoolYear(tx, schoolId, academicYear);
  return `${prefix}-${academicYear}-${String(count + 1).padStart(6, "0")}`;
}

export async function recordApplicationStatusChange(
  tx: Prisma.TransactionClient,
  params: {
    applicationId: number;
    schoolId: number;
    previousStatus: AdmissionApplicationStatus | null;
    newStatus: AdmissionApplicationStatus;
    changedById?: string | null;
    note?: string | null;
  }
) {
  await tx.admissionStatusHistory.create({
    data: {
      applicationId: params.applicationId,
      schoolId: params.schoolId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      changedById: params.changedById ?? null,
      note: params.note ?? null,
    },
  });
}

export async function getConfirmedCount(
  tx: Prisma.TransactionClient,
  admissionClassId: number
): Promise<number> {
  return tx.admissionApplication.count({
    where: {
      admissionClassId,
      applicationStatus: "CONFIRMED",
    },
  });
}

export async function syncAdmissionClassFullStatus(
  tx: Prisma.TransactionClient,
  admissionClassId: number
) {
  const admissionClass = await tx.admissionClass.findUnique({
    where: { id: admissionClassId },
    select: { seatCapacity: true, status: true },
  });
  if (!admissionClass) return;

  const confirmed = await getConfirmedCount(tx, admissionClassId);
  if (confirmed >= admissionClass.seatCapacity && admissionClass.status !== "FULL") {
    await tx.admissionClass.update({
      where: { id: admissionClassId },
      data: { status: "FULL" },
    });
  }
}

export function formatApplicationStatus(status: AdmissionApplicationStatus): string {
  const map: Record<AdmissionApplicationStatus, string> = {
    SUBMITTED: "Submitted",
    PAYMENT_PENDING: "Payment Pending",
    PAYMENT_VERIFIED: "Payment Verified",
    PAYMENT_REJECTED: "Payment Rejected",
    UNDER_REVIEW: "Under Review",
    APPROVED: "Approved",
    APPLICATION_REJECTED: "Rejected",
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

export function formatPaymentStatus(status: AdmissionPaymentStatus): string {
  const map: Record<AdmissionPaymentStatus, string> = {
    PENDING: "Pending",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
  };
  return map[status] ?? status;
}

export function getContactMobile(app: {
  guardianMobile?: string | null;
  fatherMobile: string;
  motherMobile?: string | null;
}): string {
  return app.guardianMobile || app.fatherMobile || app.motherMobile || "—";
}

export function isSessionWithinDates(
  startDate: Date,
  endDate: Date,
  now: Date = new Date()
) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return start <= now && end >= now;
}

export function isAdmissionSessionActive(session: {
  status: string;
  startDate: Date;
  endDate: Date;
}) {
  return session.status === "OPEN" && isSessionWithinDates(session.startDate, session.endDate);
}
