import type { Prisma } from "@prisma/client";
import prisma from "@/lib/db";

export type AdmissionInvoiceRecord = {
  id: number;
  invoiceNumber: string;
  amount: number | string | Prisma.Decimal;
  issuedAt: Date;
  paymentId: number | null;
};

type InvoiceClient = {
  admissionInvoice?: {
    findFirst: (...args: unknown[]) => Promise<AdmissionInvoiceRecord | null>;
    count: (...args: unknown[]) => Promise<number>;
    create: (...args: unknown[]) => Promise<unknown>;
  };
};

function hasInvoiceModel(client: InvoiceClient): boolean {
  return typeof client.admissionInvoice?.findFirst === "function";
}

export async function fetchLatestAdmissionInvoice(
  applicationId: number,
  schoolId: number
): Promise<AdmissionInvoiceRecord | null> {
  if (hasInvoiceModel(prisma)) {
    return prisma.admissionInvoice!.findFirst({
      where: { applicationId, schoolId },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        issuedAt: true,
        paymentId: true,
      },
    });
  }

  const rows = await prisma.$queryRaw<AdmissionInvoiceRecord[]>`
    SELECT id, "invoiceNumber", amount, "issuedAt", "paymentId"
    FROM "AdmissionInvoice"
    WHERE "applicationId" = ${applicationId}
      AND "schoolId" = ${schoolId}
    ORDER BY "issuedAt" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function fetchInvoiceByPaymentId(
  paymentId: number
): Promise<AdmissionInvoiceRecord | null> {
  if (hasInvoiceModel(prisma)) {
    return prisma.admissionInvoice!.findFirst({
      where: { paymentId },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        issuedAt: true,
        paymentId: true,
      },
    });
  }

  const rows = await prisma.$queryRaw<AdmissionInvoiceRecord[]>`
    SELECT id, "invoiceNumber", amount, "issuedAt", "paymentId"
    FROM "AdmissionInvoice"
    WHERE "paymentId" = ${paymentId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function countInvoicesForSchoolYear(
  tx: Prisma.TransactionClient,
  schoolId: number,
  academicYear: string
): Promise<number> {
  if (hasInvoiceModel(tx)) {
    return tx.admissionInvoice!.count({
      where: {
        schoolId,
        application: { admissionSession: { academicYear } },
      },
    });
  }

  const rows = await tx.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "AdmissionInvoice" ai
    INNER JOIN "AdmissionApplication" aa ON aa.id = ai."applicationId"
    INNER JOIN "AdmissionSession" s ON s.id = aa."admissionSessionId"
    WHERE ai."schoolId" = ${schoolId}
      AND s."academicYear" = ${academicYear}
  `;
  return rows[0]?.count ?? 0;
}

export async function createAdmissionInvoice(
  tx: Prisma.TransactionClient,
  data: {
    schoolId: number;
    applicationId: number;
    paymentId: number;
    invoiceNumber: string;
    amount: number | string | Prisma.Decimal;
    generatedById?: string | null;
  }
): Promise<void> {
  if (hasInvoiceModel(tx)) {
    await tx.admissionInvoice!.create({
      data: {
        schoolId: data.schoolId,
        applicationId: data.applicationId,
        paymentId: data.paymentId,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        generatedById: data.generatedById ?? null,
      },
    });
    return;
  }

  await tx.$executeRaw`
    INSERT INTO "AdmissionInvoice" (
      "schoolId",
      "applicationId",
      "paymentId",
      "invoiceNumber",
      amount,
      "generatedById",
      "issuedAt",
      "createdAt"
    )
    VALUES (
      ${data.schoolId},
      ${data.applicationId},
      ${data.paymentId},
      ${data.invoiceNumber},
      ${Number(data.amount)},
      ${data.generatedById ?? null},
      NOW(),
      NOW()
    )
  `;
}

export async function hasVerifiedAdmissionInvoice(
  applicationId: number,
  schoolId: number
): Promise<boolean> {
  const invoice = await ensureAdmissionInvoice(applicationId, schoolId);
  return Boolean(invoice);
}

async function buildInvoiceNumber(
  tx: Prisma.TransactionClient,
  schoolId: number,
  academicYear: string
): Promise<string> {
  const setting = await tx.admissionSetting.findUnique({ where: { schoolId } });
  const prefix =
    (setting as { invoicePrefix?: string } | null)?.invoicePrefix ?? "INV-ADM";
  const count = await countInvoicesForSchoolYear(tx, schoolId, academicYear);
  return `${prefix}-${academicYear}-${String(count + 1).padStart(6, "0")}`;
}

/** Create invoice record if verified payment exists but invoice was never generated (legacy data). */
export async function ensureAdmissionInvoice(
  applicationId: number,
  schoolId: number
): Promise<AdmissionInvoiceRecord | null> {
  const existing = await fetchLatestAdmissionInvoice(applicationId, schoolId);
  if (existing) return existing;

  const verifiedPayment = await prisma.admissionPayment.findFirst({
    where: { applicationId, schoolId, status: "VERIFIED" },
    orderBy: { verifiedAt: "desc" },
  });
  if (!verifiedPayment) return null;

  const byPayment = await fetchInvoiceByPaymentId(verifiedPayment.id);
  if (byPayment) return byPayment;

  const application = await prisma.admissionApplication.findFirst({
    where: { id: applicationId, schoolId },
    include: { admissionSession: true },
  });
  if (!application) return null;

  await prisma.$transaction(async (tx) => {
    const again = await fetchLatestAdmissionInvoice(applicationId, schoolId);
    if (again) return;

    const invoiceNumber = await buildInvoiceNumber(
      tx,
      schoolId,
      application.admissionSession.academicYear
    );

    await createAdmissionInvoice(tx, {
      schoolId,
      applicationId,
      paymentId: verifiedPayment.id,
      invoiceNumber,
      amount: verifiedPayment.amount,
      generatedById: verifiedPayment.verifiedById,
    });
  });

  return fetchLatestAdmissionInvoice(applicationId, schoolId);
}
