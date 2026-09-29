"use server";

import { revalidatePath } from "next/cache";
import type { AdmissionApplicationStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { requireSession } from "@/lib/get-session";
import { confirmAdmissionApplication } from "@/lib/admission/confirm-admission";
import { fetchLatestAdmissionInvoice, createAdmissionInvoice, fetchInvoiceByPaymentId } from "@/lib/admission/invoice.service";
import {
  type ActionResult,
  generateApplicationNumber,
  generateInvoiceNumber,
  generateVerificationCode,
  getContactMobile,
  getSchoolIdFromSlug,
  isAdmissionSessionActive,
  recordApplicationStatusChange,
} from "@/lib/admission/utils";
import {
  getVerifiedApplicationPreview,
  searchPublicApplication,
} from "@/lib/admission/application.service";
import {
  admissionApplicationActionSchema,
  admissionApplicationSchema,
  admissionClassSchema,
  admissionFilterSchema,
  admissionPaymentSubmitSchema,
  admissionPaymentVerifySchema,
  admissionSearchSchema,
  admissionSessionSchema,
  admissionSettingSchema,
} from "@/schemas/admission";

const ADMIN_PATH = "/list/admission";

async function requireAdmissionAdmin() {
  const session = await requireSession(["ADMIN", "CASHIER"]);
  if (!session.schoolId) throw new Error("No school associated with this account.");
  return { ...session, schoolId: Number(session.schoolId) };
}

async function requireAdmissionAdminOnly() {
  const session = await requireSession(["ADMIN"]);
  if (!session.schoolId) throw new Error("No school associated with this account.");
  return { ...session, schoolId: Number(session.schoolId) };
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getAdmissionSettings(): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdmin();
    let setting = await prisma.admissionSetting.findUnique({ where: { schoolId } });
    if (!setting) {
      setting = await prisma.admissionSetting.create({ data: { schoolId } });
    }
    return { success: true, message: "OK", data: setting as never };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

export async function upsertAdmissionSettings(
  input: unknown
): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdminOnly();
    const parsed = admissionSettingSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }
    await prisma.admissionSetting.upsert({
      where: { schoolId },
      create: { schoolId, ...parsed.data },
      update: parsed.data,
    });
    revalidatePath(ADMIN_PATH);
    return { success: true, message: "Admission settings saved." };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

// ─── Sessions CRUD ───────────────────────────────────────────────────────────

export async function getAdmissionSessions(): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdmin();
    const sessions = await prisma.admissionSession.findMany({
      where: { schoolId },
      include: {
        _count: { select: { admissionClasses: true, admissionApplications: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, message: "OK", data: sessions as never };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

export async function createAdmissionSession(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdminOnly();
    const parsed = admissionSessionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }
    const d = parsed.data;
<<<<<<< HEAD
    const duplicate = await prisma.admissionSession.findFirst({
      where: { schoolId, academicYear: d.academicYear },
      select: { id: true },
    });
    if (duplicate) {
      return {
        success: false,
        error: true,
        message: `An admission session already exists for academic year ${d.academicYear}.`,
      };
    }

=======
>>>>>>> 637d2b338431a202f203494526ceb5cc68466820
    await prisma.admissionSession.create({
      data: {
        schoolId,
        name: d.name,
        academicYear: d.academicYear,
        startDate: new Date(d.startDate),
        endDate: new Date(d.endDate),
        status: d.status,
      },
    });
    revalidatePath(ADMIN_PATH);
    return { success: true, message: "Admission session created." };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

export async function updateAdmissionSession(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdminOnly();
    const parsed = admissionSessionSchema.safeParse(input);
    if (!parsed.success || !parsed.data.id) {
      return { success: false, error: true, message: "Invalid session data." };
    }
    const existing = await prisma.admissionSession.findFirst({
      where: { id: parsed.data.id, schoolId },
    });
    if (!existing) return { success: false, error: true, message: "Session not found." };

<<<<<<< HEAD
    const duplicate = await prisma.admissionSession.findFirst({
      where: {
        schoolId,
        academicYear: parsed.data.academicYear,
        id: { not: parsed.data.id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return {
        success: false,
        error: true,
        message: `Another admission session already exists for academic year ${parsed.data.academicYear}.`,
      };
    }

=======
>>>>>>> 637d2b338431a202f203494526ceb5cc68466820
    await prisma.admissionSession.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        academicYear: parsed.data.academicYear,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        status: parsed.data.status,
      },
    });
    revalidatePath(ADMIN_PATH);
    return { success: true, message: "Admission session updated." };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

export async function deleteAdmissionSession(sessionId: number): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdminOnly();
    const existing = await prisma.admissionSession.findFirst({
      where: { id: sessionId, schoolId },
      include: { _count: { select: { admissionApplications: true } } },
    });
    if (!existing) return { success: false, error: true, message: "Session not found." };
    if (existing._count.admissionApplications > 0) {
      return {
        success: false,
        error: true,
        message: "Cannot delete session with existing applications.",
      };
    }
    await prisma.admissionSession.delete({ where: { id: sessionId } });
    revalidatePath(ADMIN_PATH);
    return { success: true, message: "Session deleted." };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

// ─── Admission Class Config ──────────────────────────────────────────────────

export async function getAdmissionClasses(sessionId?: number): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdmin();
    const classes = await prisma.admissionClass.findMany({
      where: {
        schoolId,
        ...(sessionId ? { admissionSessionId: sessionId } : {}),
      },
      include: {
        class: { include: { grade: true } },
        admissionSession: { select: { id: true, name: true, academicYear: true } },
        _count: {
          select: {
            admissionApplications: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const withStats = await Promise.all(
      classes.map(async (ac) => {
        const confirmed = await prisma.admissionApplication.count({
          where: { admissionClassId: ac.id, applicationStatus: "CONFIRMED" },
        });
        const pending = await prisma.admissionApplication.count({
          where: {
            admissionClassId: ac.id,
            applicationStatus: {
              notIn: ["CONFIRMED", "CANCELLED", "APPLICATION_REJECTED"],
            },
          },
        });
        return {
          ...ac,
          confirmedCount: confirmed,
          pendingCount: pending,
          availableSeats: Math.max(0, ac.seatCapacity - confirmed),
        };
      })
    );

    return { success: true, message: "OK", data: withStats as never };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

export async function upsertAdmissionClass(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdminOnly();
    const parsed = admissionClassSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }
    const d = parsed.data;

    const session = await prisma.admissionSession.findFirst({
      where: { id: d.admissionSessionId, schoolId },
    });
    if (!session) return { success: false, error: true, message: "Session not found." };

    const classItem = await prisma.class.findFirst({
      where: { id: d.classId, schoolId },
    });
    if (!classItem) return { success: false, error: true, message: "Class not found." };

    const payload = {
      schoolId,
      admissionSessionId: d.admissionSessionId,
      classId: d.classId,
      seatCapacity: d.seatCapacity,
      admissionFee: d.admissionFee,
      startDate: d.startDate ? new Date(d.startDate) : null,
      endDate: d.endDate ? new Date(d.endDate) : null,
      status: d.status,
    };

    if (d.id) {
      const existing = await prisma.admissionClass.findFirst({
        where: { id: d.id, schoolId },
      });
      if (!existing) return { success: false, error: true, message: "Admission class not found." };
      await prisma.admissionClass.update({ where: { id: d.id }, data: payload });
    } else {
      await prisma.admissionClass.create({ data: payload });
    }

    revalidatePath(ADMIN_PATH);
    return { success: true, message: "Admission class saved." };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

export async function deleteAdmissionClass(id: number): Promise<ActionResult> {
  try {
    const { schoolId } = await requireAdmissionAdminOnly();
    const existing = await prisma.admissionClass.findFirst({
      where: { id, schoolId },
      include: { _count: { select: { admissionApplications: true } } },
    });
    if (!existing) return { success: false, error: true, message: "Not found." };
    if (existing._count.admissionApplications > 0) {
      return {
        success: false,
        error: true,
        message: "Cannot delete class with applications.",
      };
    }
    await prisma.admissionClass.delete({ where: { id } });
    revalidatePath(ADMIN_PATH);
    return { success: true, message: "Admission class deleted." };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getAdmissionDashboardStats(sessionId?: number) {
  const { schoolId } = await requireAdmissionAdmin();

  const where: Prisma.AdmissionApplicationWhereInput = {
    schoolId,
    ...(sessionId ? { admissionSessionId: sessionId } : {}),
  };

  const [
    total,
    paymentPending,
    paymentVerified,
    underReview,
    approved,
    confirmed,
    rejected,
    classStats,
  ] = await Promise.all([
    prisma.admissionApplication.count({ where }),
    prisma.admissionApplication.count({
      where: { ...where, paymentStatus: "PENDING", applicationStatus: { not: "CANCELLED" } },
    }),
    prisma.admissionApplication.count({
      where: { ...where, paymentStatus: "VERIFIED" },
    }),
    prisma.admissionApplication.count({
      where: { ...where, applicationStatus: "UNDER_REVIEW" },
    }),
    prisma.admissionApplication.count({
      where: { ...where, applicationStatus: "APPROVED" },
    }),
    prisma.admissionApplication.count({
      where: { ...where, applicationStatus: "CONFIRMED" },
    }),
    prisma.admissionApplication.count({
      where: {
        ...where,
        applicationStatus: { in: ["APPLICATION_REJECTED", "PAYMENT_REJECTED"] },
      },
    }),
    prisma.admissionClass.findMany({
      where: { schoolId, ...(sessionId ? { admissionSessionId: sessionId } : {}) },
      include: {
        class: { select: { name: true } },
        _count: { select: { admissionApplications: true } },
      },
    }),
  ]);

  const classWise = await Promise.all(
    classStats.map(async (ac) => {
      const confirmedCount = await prisma.admissionApplication.count({
        where: { admissionClassId: ac.id, applicationStatus: "CONFIRMED" },
      });
      const pendingCount = await prisma.admissionApplication.count({
        where: {
          admissionClassId: ac.id,
          applicationStatus: {
            notIn: ["CONFIRMED", "CANCELLED", "APPLICATION_REJECTED"],
          },
        },
      });
      return {
        className: ac.class.name,
        applications: ac._count.admissionApplications,
        confirmed: confirmedCount,
        pending: pendingCount,
        availableSeats: Math.max(0, ac.seatCapacity - confirmedCount),
        seatCapacity: ac.seatCapacity,
      };
    })
  );

  return {
    total,
    paymentPending,
    paymentVerified,
    underReview,
    approved,
    confirmed,
    rejected,
    classWise,
  };
}

// ─── Applications List ───────────────────────────────────────────────────────

export async function getAdmissionApplications(filters: unknown) {
  const { schoolId } = await requireAdmissionAdmin();
  const parsed = admissionFilterSchema.safeParse(filters ?? {});
  const f = parsed.success ? parsed.data : {};
  const page = f.page && f.page > 0 ? f.page : 1;
  const pageSize = 20;

  const where: Prisma.AdmissionApplicationWhereInput = {
    schoolId,
    ...(f.sessionId ? { admissionSessionId: f.sessionId } : {}),
    ...(f.classId ? { admissionClass: { classId: f.classId } } : {}),
    ...(f.applicationStatus
      ? { applicationStatus: f.applicationStatus as AdmissionApplicationStatus }
      : {}),
    ...(f.paymentStatus
      ? { paymentStatus: f.paymentStatus as Prisma.EnumAdmissionPaymentStatusFilter }
      : {}),
    ...(f.dateFrom || f.dateTo
      ? {
          createdAt: {
            ...(f.dateFrom ? { gte: new Date(f.dateFrom) } : {}),
            ...(f.dateTo ? { lte: new Date(`${f.dateTo}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(f.search
      ? {
          OR: [
            { applicationNumber: { contains: f.search, mode: "insensitive" } },
            { studentName: { contains: f.search, mode: "insensitive" } },
            { fatherMobile: { contains: f.search } },
            { guardianMobile: { contains: f.search } },
            { motherMobile: { contains: f.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.admissionApplication.findMany({
      where,
      include: {
        admissionClass: { include: { class: true } },
        admissionSession: { select: { name: true, academicYear: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.admissionApplication.count({ where }),
  ]);

  return {
    items: items.map((app) => ({
      ...app,
      contactMobile: getContactMobile(app),
      className: app.admissionClass.class.name,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAdmissionApplicationDetail(applicationId: number) {
  const { schoolId } = await requireAdmissionAdmin();
  const app = await prisma.admissionApplication.findFirst({
    where: { id: applicationId, schoolId },
    include: {
      school: { select: { slug: true } },
      admissionClass: { include: { class: { include: { grade: true } } } },
      admissionSession: true,
      payments: { orderBy: { createdAt: "desc" } },
      documents: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true, surname: true } } },
      },
      student: { select: { id: true, username: true, name: true } },
    },
  });
  if (!app) return null;

  const latestInvoice = await fetchLatestAdmissionInvoice(app.id, schoolId);

  return {
    ...app,
    contactMobile: getContactMobile(app),
    invoices: latestInvoice ? [latestInvoice] : [],
  };
}

// ─── Public: Submit Application ──────────────────────────────────────────────

export async function submitAdmissionApplication(
  schoolSlug: string,
  input: unknown
): Promise<ActionResult<{ applicationNumber: string; verificationCode: string }>> {
  try {
    const schoolId = await getSchoolIdFromSlug(schoolSlug);
    if (!schoolId) return { success: false, error: true, message: "School not found." };

    const setting = await prisma.admissionSetting.findUnique({ where: { schoolId } });
    if (!setting?.admissionEnabled) {
      return { success: false, error: true, message: "Admission is not enabled." };
    }

    const parsed = admissionApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }
    const d = parsed.data;

    const admissionClass = await prisma.admissionClass.findFirst({
      where: {
        id: d.admissionClassId,
        schoolId,
        admissionSessionId: d.admissionSessionId,
        status: "OPEN",
      },
      include: { admissionSession: true },
    });

    if (
      !admissionClass ||
      !isAdmissionSessionActive(admissionClass.admissionSession)
    ) {
      return { success: false, error: true, message: "Selected class is not open for admission." };
    }

    const confirmed = await prisma.admissionApplication.count({
      where: { admissionClassId: admissionClass.id, applicationStatus: "CONFIRMED" },
    });
    if (confirmed >= admissionClass.seatCapacity) {
      return { success: false, error: true, message: "No seats available in this class." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const applicationNumber = await generateApplicationNumber(
        tx,
        schoolId,
        admissionClass.admissionSession.academicYear
      );
      const verificationCode = generateVerificationCode();

      await tx.admissionApplication.create({
        data: {
          schoolId,
          admissionSessionId: d.admissionSessionId,
          admissionClassId: d.admissionClassId,
          applicationNumber,
          verificationCode,
          studentName: d.studentName,
          studentNameBangla: d.studentNameBangla,
          surname: d.surname,
          dateOfBirth: new Date(d.dateOfBirth),
          gender: d.gender,
          birthCertificateNumber: d.birthCertificateNumber,
          bloodGroup: d.bloodGroup,
          religion: d.religion,
          nationality: d.nationality ?? "Bangladeshi",
          studentPhoto: d.studentPhoto,
          fatherName: d.fatherName,
          fatherMobile: d.fatherMobile,
          fatherOccupation: d.fatherOccupation,
          fatherNid: d.fatherNid,
          motherName: d.motherName,
          motherMobile: d.motherMobile,
          motherOccupation: d.motherOccupation,
          motherNid: d.motherNid,
          guardianName: d.guardianName,
          guardianMobile: d.guardianMobile,
          guardianRelation: d.guardianRelation,
          presentAddress: d.presentAddress,
          permanentAddress: d.permanentAddress,
          division: d.division,
          district: d.district,
          upazila: d.upazila,
          villageArea: d.villageArea,
          previousSchool: d.previousSchool,
          previousClass: d.previousClass,
          previousResult: d.previousResult,
          previousSchoolAddress: d.previousSchoolAddress,
          transferCertificateNumber: d.transferCertificateNumber,
          medicalInfo: d.medicalInfo,
          applicationStatus: "SUBMITTED",
          paymentStatus: "PENDING",
        },
      });

      const application = await tx.admissionApplication.findFirst({
        where: { schoolId, applicationNumber },
        select: { id: true },
      });

      if (application) {
        await recordApplicationStatusChange(tx, {
          applicationId: application.id,
          schoolId,
          previousStatus: null,
          newStatus: "SUBMITTED",
          note: "Application submitted by applicant",
        });
      }

      return { applicationNumber, verificationCode };
    });

    return {
      success: true,
      message: "Application submitted successfully.",
      data: result,
    };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

// ─── Public: Submit Payment ────────────────────────────────────────────────────

export async function submitAdmissionPayment(input: unknown): Promise<ActionResult> {
  try {
    const parsed = admissionPaymentSubmitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }
    const d = parsed.data;
    const schoolId = await getSchoolIdFromSlug(d.schoolSlug);
    if (!schoolId) return { success: false, error: true, message: "School not found." };

    const application = await prisma.admissionApplication.findFirst({
      where: { schoolId, applicationNumber: d.applicationNumber },
      include: { admissionClass: true },
    });
    if (!application) {
      return { success: false, error: true, message: "Application not found." };
    }
    if (["CONFIRMED", "CANCELLED", "APPLICATION_REJECTED"].includes(application.applicationStatus)) {
      return { success: false, error: true, message: "Application is closed." };
    }

    const existingTrx = await prisma.admissionPayment.findUnique({
      where: { transactionId: d.transactionId },
    });
    if (existingTrx) {
      return { success: false, error: true, message: "Transaction ID already used." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.admissionPayment.create({
        data: {
          schoolId,
          applicationId: application.id,
          amount: application.admissionClass.admissionFee,
          paymentMethod: "MOBILE_BANKING",
          senderMobile: d.senderMobile,
          transactionId: d.transactionId,
          status: "PENDING",
        },
      });

      const prev = application.applicationStatus;
      await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          paymentStatus: "PENDING",
          applicationStatus: "PAYMENT_PENDING",
        },
      });

      if (prev !== "PAYMENT_PENDING") {
        await recordApplicationStatusChange(tx, {
          applicationId: application.id,
          schoolId,
          previousStatus: prev,
          newStatus: "PAYMENT_PENDING",
          note: "Payment details submitted",
        });
      }
    });

    return { success: true, message: "Payment submitted. Awaiting verification." };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

// ─── Admin: Verify Payment ─────────────────────────────────────────────────────

export async function verifyAdmissionPayment(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId, userId } = await requireAdmissionAdmin();
    const parsed = admissionPaymentVerifySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: true, message: "Invalid payment action." };
    }

    const payment = await prisma.admissionPayment.findFirst({
      where: { id: parsed.data.paymentId, schoolId },
      include: { application: true },
    });
    if (!payment) return { success: false, error: true, message: "Payment not found." };
    if (payment.status !== "PENDING") {
      return { success: false, error: true, message: "Payment already processed." };
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.data.action === "verify") {
        await tx.admissionPayment.update({
          where: { id: payment.id },
          data: {
            status: "VERIFIED",
            verifiedById: userId,
            verifiedAt: new Date(),
          },
        });
        const prev = payment.application.applicationStatus;
        await tx.admissionApplication.update({
          where: { id: payment.applicationId },
          data: {
            paymentStatus: "VERIFIED",
            applicationStatus: "PAYMENT_VERIFIED",
          },
        });
        await recordApplicationStatusChange(tx, {
          applicationId: payment.applicationId,
          schoolId,
          previousStatus: prev,
          newStatus: "PAYMENT_VERIFIED",
          changedById: userId,
          note: "Payment verified",
        });

        const existingInvoice = await fetchInvoiceByPaymentId(payment.id);
        if (!existingInvoice) {
          const applicationWithSession = await tx.admissionApplication.findFirst({
            where: { id: payment.applicationId, schoolId },
            include: { admissionSession: true },
          });
          if (applicationWithSession) {
            const invoiceNumber = await generateInvoiceNumber(
              tx,
              schoolId,
              applicationWithSession.admissionSession.academicYear
            );
            await createAdmissionInvoice(tx, {
              schoolId,
              applicationId: payment.applicationId,
              paymentId: payment.id,
              invoiceNumber,
              amount: payment.amount,
              generatedById: userId,
            });
          }
        }

        await tx.admissionApplication.update({
          where: { id: payment.applicationId },
          data: { applicationStatus: "UNDER_REVIEW" },
        });
        await recordApplicationStatusChange(tx, {
          applicationId: payment.applicationId,
          schoolId,
          previousStatus: "PAYMENT_VERIFIED",
          newStatus: "UNDER_REVIEW",
          changedById: userId,
          note: "Moved to review after payment verification",
        });
      } else {
        await tx.admissionPayment.update({
          where: { id: payment.id },
          data: {
            status: "REJECTED",
            verifiedById: userId,
            verifiedAt: new Date(),
            rejectionReason: parsed.data.rejectionReason ?? "Payment rejected",
          },
        });
        const prev = payment.application.applicationStatus;
        await tx.admissionApplication.update({
          where: { id: payment.applicationId },
          data: {
            paymentStatus: "REJECTED",
            applicationStatus: "PAYMENT_REJECTED",
          },
        });
        await recordApplicationStatusChange(tx, {
          applicationId: payment.applicationId,
          schoolId,
          previousStatus: prev,
          newStatus: "PAYMENT_REJECTED",
          changedById: userId,
          note: parsed.data.rejectionReason ?? "Payment rejected",
        });
      }
    });

    revalidatePath(ADMIN_PATH);
    return {
      success: true,
      message:
        parsed.data.action === "verify"
          ? "Payment verified. Application moved to review."
          : "Payment rejected.",
    };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

// ─── Admin: Application Actions ──────────────────────────────────────────────

export async function processAdmissionApplication(input: unknown): Promise<ActionResult> {
  try {
    const { schoolId, userId } = await requireAdmissionAdmin();
    const parsed = admissionApplicationActionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: true, message: "Invalid action." };
    }

    const application = await prisma.admissionApplication.findFirst({
      where: { id: parsed.data.applicationId, schoolId },
      include: { admissionSession: true, admissionClass: true },
    });
    if (!application) return { success: false, error: true, message: "Application not found." };

    const { action, note, rejectionReason } = parsed.data;

    if (action === "review") {
      if (application.paymentStatus !== "VERIFIED") {
        return { success: false, error: true, message: "Payment must be verified first." };
      }
      await prisma.$transaction(async (tx) => {
        const prev = application.applicationStatus;
        await tx.admissionApplication.update({
          where: { id: application.id },
          data: { applicationStatus: "UNDER_REVIEW" },
        });
        await recordApplicationStatusChange(tx, {
          applicationId: application.id,
          schoolId,
          previousStatus: prev,
          newStatus: "UNDER_REVIEW",
          changedById: userId,
          note,
        });
      });
    } else if (action === "approve") {
      if (!["UNDER_REVIEW", "PAYMENT_VERIFIED"].includes(application.applicationStatus)) {
        return { success: false, error: true, message: "Application is not ready for approval." };
      }
      await prisma.$transaction(async (tx) => {
        const prev = application.applicationStatus;
        await tx.admissionApplication.update({
          where: { id: application.id },
          data: { applicationStatus: "APPROVED" },
        });
        await recordApplicationStatusChange(tx, {
          applicationId: application.id,
          schoolId,
          previousStatus: prev,
          newStatus: "APPROVED",
          changedById: userId,
          note,
        });
      });
    } else if (action === "reject") {
      await prisma.$transaction(async (tx) => {
        const prev = application.applicationStatus;
        await tx.admissionApplication.update({
          where: { id: application.id },
          data: { applicationStatus: "APPLICATION_REJECTED" },
        });
        await recordApplicationStatusChange(tx, {
          applicationId: application.id,
          schoolId,
          previousStatus: prev,
          newStatus: "APPLICATION_REJECTED",
          changedById: userId,
          note: rejectionReason ?? note ?? "Application rejected",
        });
      });
    } else if (action === "confirm") {
      if (application.applicationStatus !== "APPROVED") {
        return { success: false, error: true, message: "Application must be approved first." };
      }
      const result = await prisma.$transaction(async (tx) => {
        const fresh = await tx.admissionApplication.findFirst({
          where: { id: application.id, schoolId, applicationStatus: "APPROVED", studentId: null },
        });
        if (!fresh) throw new Error("Application cannot be confirmed.");

        return confirmAdmissionApplication(tx, {
          application: fresh,
          schoolId,
          confirmedById: userId!,
          academicYear: application.admissionSession.academicYear,
        });
      });
      revalidatePath("/list/students");
      revalidatePath(ADMIN_PATH);
      return {
        success: true,
        message: `Admission confirmed. Student username: ${result.username}`,
        data: result as never,
      };
    } else if (action === "cancel") {
      if (application.applicationStatus === "CONFIRMED") {
        return { success: false, error: true, message: "Confirmed application cannot be cancelled." };
      }
      await prisma.$transaction(async (tx) => {
        const prev = application.applicationStatus;
        await tx.admissionApplication.update({
          where: { id: application.id },
          data: { applicationStatus: "CANCELLED" },
        });
        await recordApplicationStatusChange(tx, {
          applicationId: application.id,
          schoolId,
          previousStatus: prev,
          newStatus: "CANCELLED",
          changedById: userId,
          note: note ?? "Cancelled",
        });
      });
    }

    revalidatePath(ADMIN_PATH);
    return { success: true, message: "Application updated." };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

export async function getSchoolClassesForAdmission() {
  const { schoolId } = await requireAdmissionAdminOnly();
  return prisma.class.findMany({
    where: { schoolId },
    include: { grade: true },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });
}

export async function getPublicApplicationStatus(
  schoolSlug: string,
  applicationNumber: string
) {
  const schoolId = await getSchoolIdFromSlug(schoolSlug);
  if (!schoolId) return null;

  return prisma.admissionApplication.findFirst({
    where: { schoolId, applicationNumber },
    select: {
      applicationNumber: true,
      studentName: true,
      applicationStatus: true,
      paymentStatus: true,
      admissionClass: {
        select: {
          admissionFee: true,
          class: { select: { name: true } },
        },
      },
    },
  });
}

export async function searchAdmissionApplication(input: unknown): Promise<ActionResult> {
  try {
    const parsed = admissionSearchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const result = await searchPublicApplication(parsed.data);
    if (!result.ok) {
      return { success: false, error: true, message: result.message };
    }

    return { success: true, message: "Application found.", data: result.data as never };
  } catch (e) {
    return { success: false, error: true, message: (e as Error).message };
  }
}

export async function getApplicationPreview(input: {
  schoolSlug: string;
  applicationNumber: string;
  mobile?: string;
  verificationCode?: string;
}) {
  return getVerifiedApplicationPreview(input);
}
