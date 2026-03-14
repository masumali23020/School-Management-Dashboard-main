"use server";

// src/Actions/SalaryActions/salaryActions.ts
// Full teacher salary management — mirrors feeActions.ts patterns exactly

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRole } from "@/lib/utlis";

// ── Helpers ────────────────────────────────────────────────────────────────

async function requireRole(...roles: string[]) {
  const { role } = await getUserRole();
  if (!roles.includes(role)) throw new Error("Unauthorized");
  return role;
}

async function generateSalaryInvoice(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.teacherSalaryPayment.count({
    where: { invoiceNumber: { startsWith: `SAL-${year}-` } },
  });
  return `SAL-${year}-${String(count + 1).padStart(5, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════
// SALARY TYPE CRUD  (Admin only)
// ═══════════════════════════════════════════════════════════════════════

export async function createSalaryType(data: {
  name: string;
  description?: string;
  isRecurring?: boolean;
}) {
  await requireRole("admin");
  try {
    const st = await prisma.salaryType.create({ data });
    revalidatePath("/list/salary");
    return { success: true, data: st };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, error: "Salary type name already exists." };
    return { success: false, error: "Failed to create salary type." };
  }
}

export async function updateSalaryType(
  id: number,
  data: { name?: string; description?: string; isActive?: boolean; isRecurring?: boolean }
) {
  await requireRole("admin");
  try {
    const st = await prisma.salaryType.update({ where: { id }, data });
    revalidatePath("/list/salary");
    return { success: true, data: st };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, error: "Name already exists." };
    return { success: false, error: "Failed to update salary type." };
  }
}

export async function deleteSalaryType(id: number) {
  await requireRole("admin");
  try {
    await prisma.salaryType.delete({ where: { id } });
    revalidatePath("/list/salary");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2003") return { success: false, error: "Cannot delete — payments exist for this type." };
    return { success: false, error: "Failed to delete salary type." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEACHER SALARY STRUCTURE CRUD  (Admin only)
// ═══════════════════════════════════════════════════════════════════════

export async function upsertTeacherSalaryStructure(data: {
  teacherId:    string;
  salaryTypeId: number;
  amount:       number;
}) {
  await requireRole("admin");
  try {
    const existing = await prisma.teacherSalaryStructure.findUnique({
      where: { teacherId_salaryTypeId: { teacherId: data.teacherId, salaryTypeId: data.salaryTypeId } },
    });
    let record;
    if (existing) {
      record = await prisma.teacherSalaryStructure.update({
        where: { id: existing.id },
        data:  { amount: data.amount },
      });
    } else {
      record = await prisma.teacherSalaryStructure.create({ data });
    }
    revalidatePath("/list/salary");
    return { success: true, data: record };
  } catch (e: any) {
    return { success: false, error: "Failed to save salary structure." };
  }
}

export async function deleteTeacherSalaryStructure(id: number) {
  await requireRole("admin");
  try {
    await prisma.teacherSalaryStructure.delete({ where: { id } });
    revalidatePath("/list/salary");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2003") return { success: false, error: "Cannot delete — payments exist for this structure." };
    return { success: false, error: "Failed to delete salary structure." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEACHER SEARCH  (Admin + HisabRokhok)
// ═══════════════════════════════════════════════════════════════════════

export async function searchTeachers(params: {
  name?:      string;
  teacherId?: string;
  subjectId?: number;
}) {
  await requireRole("admin", "HisabRokhok");
  try {
    const teachers = await prisma.teacher.findMany({
      where: {
        AND: [
          params.name ? {
            OR: [
              { name:    { contains: params.name, mode: "insensitive" } },
              { surname: { contains: params.name, mode: "insensitive" } },
            ],
          } : {},
          params.teacherId ? { id: { contains: params.teacherId, mode: "insensitive" } } : {},
          params.subjectId ? { subjects: { some: { id: params.subjectId } } } : {},
        ],
      },
      include: {
        subjects: { select: { id: true, name: true } },
        salaryStructures: {
          include: { salaryType: true },
        },
      },
      orderBy: { name: "asc" },
      take: 30,
    });

    return {
      success: true,
      data: teachers.map((t) => ({
        id:               t.id,
        name:             t.name,
        surname:          t.surname,
        img:              t.img,
        phone:            t.phone,
        subjects:         t.subjects.map((s) => s.name),
        salaryStructures: t.salaryStructures.map((s) => ({
          id:            s.id,
          salaryTypeId:  s.salaryTypeId,
          salaryTypeName: s.salaryType.name,
          amount:        s.amount,
        })),
      })),
    };
  } catch {
    return { success: false, error: "Search failed." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET TEACHER SALARY STATUS  (Admin + HisabRokhok)
// ═══════════════════════════════════════════════════════════════════════

export async function getTeacherSalaryStatus(teacherId: string, academicYear?: string) {
  await requireRole("admin", "HisabRokhok", "teacher");

  const year = academicYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  try {
    // All salary structures for this teacher
    const structures = await prisma.teacherSalaryStructure.findMany({
      where:   { teacherId },
      include: { salaryType: true },
    });

    // All payments this year
    const payments = await prisma.teacherSalaryPayment.findMany({
      where:   { teacherId, academicYear: year },
      include: { salaryType: true },
      orderBy: { paidAt: "desc" },
    });

    // Build status per structure
    const salaryStatus = structures.map((s) => {
      const structurePayments = payments.filter((p) => Number(p.salaryStructureId) === s.id);
      const totalPaid = structurePayments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
      return {
        structureId:   s.id,
        salaryTypeId:  s.salaryTypeId,
        salaryTypeName: s.salaryType.name,
        isRecurring:   s.salaryType.isRecurring,
        amount:        s.amount,
        totalPaid,
        payments: structurePayments.map((p) => ({
          id:            p.id,
          invoiceNumber: p.invoiceNumber,
          amountPaid:    p.amountPaid,
          paymentMethod: p.paymentMethod as string,
          monthLabel:    p.monthLabel,
          paidAt:        p.paidAt.toISOString(),
          collectedBy:   p.collectedBy,
        })),
      };
    });

    const totalConfigured = structures.reduce((s, r) => s + Number(r.amount), 0);
    const totalPaid       = payments.reduce((s, p) => s + Number(p.amountPaid), 0);


    return {
      success: true,
      data: { salaryStatus, totalConfigured, totalPaid, academicYear: year },
    };
  } catch {
    return { success: false, error: "Failed to load salary status." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// RECORD SALARY PAYMENT  (Admin + HisabRokhok)
// ═══════════════════════════════════════════════════════════════════════

export async function recordSalaryPayment(data: {
  teacherId:         string;
  salaryTypeId:      number;
  salaryStructureId?: number;
  amountPaid:        number;
  paymentMethod:     "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER";
  academicYear:      string;
  monthLabel?:       string;
  remarks?:          string;
}) {
  await requireRole("admin", "cashier");

  // Get cashier name
  let collectedBy = "cashier";
  try {
    const session = await getUserRole() as any;
    collectedBy = session?.username || session?.userId || session?.id || collectedBy;
  } catch {}

  try {
    const invoiceNumber = await generateSalaryInvoice();

    const payment = await prisma.teacherSalaryPayment.create({
      data: {
        invoiceNumber,
        teacherId:         data.teacherId,
        salaryTypeId:      data.salaryTypeId,
        salaryStructureId: data.salaryStructureId ?? null,
        amountPaid:        data.amountPaid,
        paymentMethod:     data.paymentMethod,
        academicYear:      data.academicYear,
        monthLabel:        data.monthLabel  || null,
        remarks:           data.remarks     || null,
        collectedBy,
      },
    });

    // Fetch full record for invoice
    const full = await prisma.teacherSalaryPayment.findUnique({
      where: { id: payment.id },
      include: {
        teacher:    true,
        salaryType: true,
      },
    });

    revalidatePath("/list/salary");
    revalidatePath("/list/salary/cashier");

    return {
      success: true,
      data: {
        id:            full!.id,
        invoiceNumber: full!.invoiceNumber,
        teacherName:   `${full!.teacher.name} ${full!.teacher.surname}`,
        teacherId:     full!.teacherId,
        salaryTypeName: full!.salaryType.name,
        amountPaid:    full!.amountPaid,
        paymentMethod: full!.paymentMethod as string,
        monthLabel:    full!.monthLabel,
        academicYear:  full!.academicYear,
        paidAt:        full!.paidAt.toISOString(),
        collectedBy:   full!.collectedBy,
        remarks:       full!.remarks,
      },
    };
  } catch (e: any) {
    return { success: false, error: "DB_ERROR: " + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET TEACHER PAYMENT HISTORY  (Admin + HisabRokhok + teacher themselves)
// ═══════════════════════════════════════════════════════════════════════

export async function getTeacherPaymentHistory(teacherId: string, academicYear?: string) {
  await requireRole("admin", "HisabRokhok", "teacher");

  const where: any = { teacherId };
  if (academicYear) where.academicYear = academicYear;

  const payments = await prisma.teacherSalaryPayment.findMany({
    where,
    include: { salaryType: true },
    orderBy: { paidAt: "desc" },
  });

  return {
    success: true,
    data: payments.map((p) => ({
      id:             p.id,
      invoiceNumber:  p.invoiceNumber,
      salaryTypeName: p.salaryType.name,
      salaryTypeId:   p.salaryTypeId,
      structureId:    p.salaryStructureId,
      amountPaid:     p.amountPaid,
      paymentMethod:  p.paymentMethod as string,
      academicYear:   p.academicYear,
      monthLabel:     p.monthLabel,
      paidAt:         p.paidAt.toISOString(),
      collectedBy:    p.collectedBy,
      remarks:        p.remarks,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET ALL SALARY PAYMENTS  (admin / HisabRokhok — for payment list page)
// ═══════════════════════════════════════════════════════════════════════

export async function getAllSalaryPayments(params: {
  teacherName?:   string;
  salaryTypeId?:  number;
  academicYear?:  string;
  fromDate?:      string;
  toDate?:        string;
  paymentMethod?: string;
}) {
  await requireRole("admin", "HisabRokhok");

  const where: any = {};
  if (params.academicYear)  where.academicYear  = params.academicYear;
  if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
  if (params.salaryTypeId)  where.salaryTypeId  = params.salaryTypeId;

  if (params.fromDate || params.toDate) {
    where.paidAt = {};
    if (params.fromDate) where.paidAt.gte = new Date(params.fromDate);
    if (params.toDate) {
      const to = new Date(params.toDate);
      to.setHours(23, 59, 59, 999);
      where.paidAt.lte = to;
    }
  }

  if (params.teacherName) {
    where.teacher = {
      OR: [
        { name:    { contains: params.teacherName, mode: "insensitive" } },
        { surname: { contains: params.teacherName, mode: "insensitive" } },
      ],
    };
  }

  const payments = await prisma.teacherSalaryPayment.findMany({
    where,
    include: { teacher: true, salaryType: true },
    orderBy: { paidAt: "desc" },
    take: 500,
  });

const totalAmount = payments.reduce(
  (s, p) => s + parseFloat(p.amountPaid.toString()),
  0
);

  return {
    success: true,
    totalAmount,
    count: payments.length,
    data: payments.map((p) => ({
      id:             p.id,
      invoiceNumber:  p.invoiceNumber,
      teacherId:      p.teacherId,
      teacherName:    `${p.teacher.name} ${p.teacher.surname}`,
      teacherImg:     p.teacher.img,
      salaryTypeName: p.salaryType.name,
      amountPaid:     p.amountPaid,
      paymentMethod:  p.paymentMethod as string,
      academicYear:   p.academicYear,
      monthLabel:     p.monthLabel,
      paidAt:         p.paidAt.toISOString(),
      collectedBy:    p.collectedBy,
      remarks:        p.remarks,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET FULL INVOICE FOR PDF  (admin / HisabRokhok / teacher themselves)
// ═══════════════════════════════════════════════════════════════════════

export async function getFullSalaryInvoiceForPDF(invoiceNumber: string) {
  await requireRole("admin", "HisabRokhok", "teacher");

  const payment = await prisma.teacherSalaryPayment.findUnique({
    where:   { invoiceNumber },
    include: { teacher: true, salaryType: true },
  });

  if (!payment) return { success: false, error: "Invoice not found." };

  return {
    success: true,
    data: {
      invoiceNumber:  payment.invoiceNumber,
      teacherId:      payment.teacherId,
      teacherName:    `${payment.teacher.name} ${payment.teacher.surname}`,
      teacherPhone:   payment.teacher.phone,
      salaryTypeName: payment.salaryType.name,
      isRecurring:    payment.salaryType.isRecurring,
      amountPaid:     payment.amountPaid,
      paymentMethod:  payment.paymentMethod as string,
      monthLabel:     payment.monthLabel,
      academicYear:   payment.academicYear,
      paidAt:         payment.paidAt.toISOString(),
      collectedBy:    payment.collectedBy,
      remarks:        payment.remarks,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET SALARY ACADEMIC YEARS  (for filter dropdown)
// ═══════════════════════════════════════════════════════════════════════

export async function getSalaryAcademicYears() {
  await requireRole("admin", "HisabRokhok");
  const rows = await prisma.teacherSalaryPayment.findMany({
    distinct: ["academicYear"],
    select:   { academicYear: true },
    orderBy:  { academicYear: "desc" },
  });
  return rows.map((r) => r.academicYear);
}