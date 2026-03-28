"use server";

// src/Actions/SalaryActions/salaryActions.ts

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRole } from "@/lib/utlis";
import { auth, clerkClient } from "@clerk/nextjs/server";

// ── Helpers ────────────────────────────────────────────────────────────────

async function requireRole(...roles: string[]) {
  const { role } = await getUserRole();
  const hasAccess = roles.some((r) => r.toUpperCase() === role?.toUpperCase());
  if (!hasAccess) throw new Error("Unauthorized");
  return role;
}

/**
 * Gets the current logged-in employee's DB `id` for use as processedById FK.
 *
 * All create actions (createAdmin, createTeacher, createStaff, createCashier)
 * set Employee.id = Clerk user.id, so auth().userId should always match.
 *
 * If the ADMIN was created manually in Clerk dashboard (not via createAdmin action),
 * their Employee row won't exist — solution is to recreate them via the app's form.
 */
async function getProcessorId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: Not logged in.");

  const employee = await prisma.employee.findUnique({
    where:  { id: userId },
    select: { id: true },
  });

  if (!employee) {
    // Fallback: try matching by Clerk username → Employee.username
    const client    = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const uname     = clerkUser.username;
    console.log(clerkUser)

    if (uname) {
      const byUsername = await prisma.employee.findUnique({
        where:  { username: uname },
        select: { id: true },
      });
      if (byUsername) return byUsername.id;
    }

    throw new Error(
      `কোনো Employee record পাওয়া যায়নি।\n` +
      `Clerk userId: "${userId}", username: "${clerkUser.username ?? "N/A"}"\n` +
      `সমাধান: এই user টি Delete করে app এর form দিয়ে আবার তৈরি করুন।`
    );
  }

  return employee.id;
}

async function generateSalaryInvoice(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.employeeSalaryPayment.count({
    where: { invoiceNumber: { startsWith: `SAL-${year}-` } },
  });
  return `SAL-${year}-${String(count + 1).padStart(5, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════
// SALARY TYPE CRUD
// ═══════════════════════════════════════════════════════════════════════

export async function createSalaryType(data: {
  name: string;
  description?: string;
  isRecurring?: boolean;
}) {
  await requireRole("ADMIN");
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
  await requireRole("ADMIN");
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
  await requireRole("ADMIN");
  try {
    await prisma.salaryType.delete({ where: { id } });
    revalidatePath("/list/salary");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2003")
      return { success: false, error: "Cannot delete — payments exist for this type." };
    return { success: false, error: "Failed to delete salary type." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EMPLOYEE SALARY STRUCTURE CRUD (Admin only)
// ═══════════════════════════════════════════════════════════════════════

export async function upsertEmployeeSalaryStructure(data: {
  employeeId:   string;
  salaryTypeId: number;
  amount:       number;
}) {
  await requireRole("ADMIN");
  try {
    const record = await prisma.employeeSalaryStructure.upsert({
      where: {
        employeeId_salaryTypeId: {
          employeeId:   data.employeeId,
          salaryTypeId: data.salaryTypeId,
        },
      },
      update: { amount: data.amount },
      create: {
        employeeId:   data.employeeId,
        salaryTypeId: data.salaryTypeId,
        amount:       data.amount,
      },
    });
    revalidatePath("/list/salary");
    return { success: true, data: record };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: "Failed to save salary structure." };
  }
}

export async function deleteEmployeeSalaryStructure(id: number) {
  await requireRole("ADMIN");
  try {
    await prisma.employeeSalaryStructure.delete({ where: { id } });
    revalidatePath("/list/salary");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2003")
      return { success: false, error: "Cannot delete — payments exist for this structure." };
    return { success: false, error: "Failed to delete salary structure." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EMPLOYEE SEARCH (Admin + Cashier)
// ═══════════════════════════════════════════════════════════════════════

export async function searchEmployees(params: {
  name?:       string;
  employeeId?: string;
  subjectId?:  number;
}) {
  await requireRole("ADMIN", "CASHIER");
  try {
    const employees = await prisma.employee.findMany({
      where: {
        AND: [
          params.name
            ? {
                OR: [
                  { name:    { contains: params.name, mode: "insensitive" } },
                  { surname: { contains: params.name, mode: "insensitive" } },
                ],
              }
            : {},
          params.employeeId
            ? { id: { contains: params.employeeId, mode: "insensitive" } }
            : {},
          params.subjectId
            ? { subjects: { some: { id: params.subjectId } } }
            : {},
        ],
      },
      include: {
        subjects:         { select: { id: true, name: true } },
        salaryStructures: { include: { salaryType: true } },
      },
      orderBy: { name: "asc" },
      take: 30,
    });

    return {
      success: true,
      data: employees.map((e) => ({
        id:       e.id,
        name:     e.name,
        surname:  e.surname,
        img:      e.img,
        phone:    e.phone,
        subjects: e.subjects.map((s) => s.name),
        salaryStructures: e.salaryStructures.map((s) => ({
          id:             s.id,
          salaryTypeId:   s.salaryTypeId,
          salaryTypeName: s.salaryType.name,
          amount:         Number(s.amount),
        })),
      })),
    };
  } catch {
    return { success: false, error: "Search failed." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET EMPLOYEE SALARY STATUS (Admin + Cashier)
// ═══════════════════════════════════════════════════════════════════════

export async function getEmployeeSalaryStatus(employeeId: string, academicYear: string) {
  await requireRole("ADMIN", "CASHIER");
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        salaryStructures: { include: { salaryType: true } },
        salaryPayments: {
          where:   { academicYear },
          include: { salaryType: true },
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!employee) return { success: false, error: "Employee not found." };

    const salaryStatus = employee.salaryStructures.map((structure) => {
      const structurePayments = employee.salaryPayments.filter(
        (p) => p.salaryTypeId === structure.salaryTypeId
      );
      const totalPaid = structurePayments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

      return {
        structureId:    structure.id,
        salaryTypeId:   structure.salaryTypeId,
        salaryTypeName: structure.salaryType.name,
        isRecurring:    structure.salaryType.isRecurring,
        amount:         Number(structure.amount),
        totalPaid,
        payments: structurePayments.map((p) => ({
          id:            p.id,
          invoiceNumber: p.invoiceNumber,
          amountPaid:    Number(p.amountPaid),
          paymentMethod: p.paymentMethod,
          monthLabel:    p.monthLabel,
          paidAt:        p.paidAt.toISOString(),
          processedById: p.processedById,
        })),
      };
    });

    return {
      success: true,
      data: {
        salaryStatus,
        totalPaid: employee.salaryPayments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
        academicYear,
      },
    };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: "Failed to fetch salary status." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// RECORD SALARY PAYMENT
// ═══════════════════════════════════════════════════════════════════════

export async function recordSalaryPayment(data: {
  employeeId:         string;
  salaryTypeId:       number;
  salaryStructureId?: number;
  amountPaid:         number;
  paymentMethod:      "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER";
  academicYear:       string;
  monthLabel?:        string;
  remarks?:           string;
}) {
  await requireRole("ADMIN", "CASHIER");

  let processedById: string;
  try {
    processedById = await getProcessorId();
  } catch (e: any) {
    return { success: false, error: e.message };
  }

  try {
    const invoiceNumber = await generateSalaryInvoice();

    const payment = await prisma.employeeSalaryPayment.create({
      data: {
        invoiceNumber,
        employeeId:        data.employeeId,
        salaryTypeId:      data.salaryTypeId,
        salaryStructureId: data.salaryStructureId ?? null,
        amountPaid:        data.amountPaid,
        paymentMethod:     data.paymentMethod,
        academicYear:      data.academicYear,
        monthLabel:        data.monthLabel ?? null,
        remarks:           data.remarks ?? null,
        processedById,
      },
      include: {
        employee:   true,
        salaryType: true,
      },
    });

    revalidatePath("/list/salary");
    revalidatePath("/list/salary/cashier");
    revalidatePath("/list/salary/payments");

    return {
      success: true,
      data: {
        ...payment,
        amountPaid: Number(payment.amountPaid),
        paidAt:     payment.paidAt.toISOString(),
      },
    };
  } catch (e: any) {
    console.error("recordSalaryPayment error:", e);
    return { success: false, error: "Database error: " + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET ALL SALARY PAYMENTS (Admin + Cashier)
// ═══════════════════════════════════════════════════════════════════════

export async function getAllSalaryPayments(params: {
  employeeName?:  string;
  salaryTypeId?:  number;
  academicYear?:  string;
  fromDate?:      string;
  toDate?:        string;
  paymentMethod?: string;
}) {
  await requireRole("ADMIN", "CASHIER");

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

  if (params.employeeName) {
    where.employee = {
      OR: [
        { name:    { contains: params.employeeName, mode: "insensitive" } },
        { surname: { contains: params.employeeName, mode: "insensitive" } },
      ],
    };
  }

  const payments = await prisma.employeeSalaryPayment.findMany({
    where,
    include: {
      employee:    true,
      salaryType:  true,
      processedBy: true,
    },
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
      employeeId:     p.employeeId,
      employeeName:   `${p.employee.name} ${p.employee.surname}`,
      employeeImg:    p.employee.img,
      salaryTypeName: p.salaryType.name,
      amountPaid:     Number(p.amountPaid),
      paymentMethod:  p.paymentMethod as string,
      academicYear:   p.academicYear,
      monthLabel:     p.monthLabel,
      paidAt:         p.paidAt.toISOString(),
      processedBy:    p.processedBy
        ? `${p.processedBy.name} ${p.processedBy.surname}`
        : "—",
      remarks:        p.remarks,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET FULL INVOICE FOR PDF
// ═══════════════════════════════════════════════════════════════════════

export async function getFullSalaryInvoiceForPDF(invoiceNumber: string) {
  await requireRole("ADMIN", "CASHIER", "TEACHER");

  const payment = await prisma.employeeSalaryPayment.findUnique({
    where: { invoiceNumber },
    include: {
      employee:    true,
      salaryType:  true,
      processedBy: true,
    },
  });

  if (!payment) return { success: false, error: "Invoice not found." };

  return {
    success: true,
    data: {
      invoiceNumber:  payment.invoiceNumber,
      employeeId:     payment.employeeId,
      employeeName:   `${payment.employee.name} ${payment.employee.surname}`,
      employeePhone:  payment.employee.phone,
      salaryTypeName: payment.salaryType.name,
      isRecurring:    payment.salaryType.isRecurring,
      amountPaid:     Number(payment.amountPaid),
      paymentMethod:  payment.paymentMethod as string,
      monthLabel:     payment.monthLabel,
      academicYear:   payment.academicYear,
      paidAt:         payment.paidAt.toISOString(),
      processedBy:    payment.processedBy
        ? `${payment.processedBy.name} ${payment.processedBy.surname}`
        : "—",
      processedById:  payment.processedById,
      remarks:        payment.remarks,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET EMPLOYEE SALARY STATUS (for self-view)
// ═══════════════════════════════════════════════════════════════════════

export async function getTeacherSalaryStatus(employeeId: string, academicYear?: string) {
  await requireRole("ADMIN", "CASHIER", "TEACHER");

  const year =
    academicYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  try {
    const structures = await prisma.employeeSalaryStructure.findMany({
      where:   { employeeId },
      include: { salaryType: true },
    });

    const payments = await prisma.employeeSalaryPayment.findMany({
      where:   { employeeId, academicYear: year },
      include: { salaryType: true },
      orderBy: { paidAt: "desc" },
    });

    const salaryStatus = structures.map((s) => {
      const structurePayments = payments.filter((p) => p.salaryStructureId === s.id);
      const totalPaid = structurePayments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

      return {
        structureId:    s.id,
        salaryTypeId:   s.salaryTypeId,
        salaryTypeName: s.salaryType?.name ?? "N/A",
        isRecurring:    s.salaryType?.isRecurring ?? false,
        amount:         Number(s.amount),
        totalPaid,
        payments: structurePayments.map((p) => ({
          id:            p.id,
          invoiceNumber: p.invoiceNumber,
          amountPaid:    Number(p.amountPaid),
          paymentMethod: p.paymentMethod,
          monthLabel:    p.monthLabel,
          paidAt:        p.paidAt.toISOString(),
          processedById: p.processedById,
        })),
      };
    });

    return {
      success: true,
      data: {
        salaryStatus,
        totalConfigured: structures.reduce((s, r) => s + Number(r.amount), 0),
        totalPaid:       payments.reduce((s, p) => s + Number(p.amountPaid), 0),
        academicYear:    year,
      },
    };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: "Failed to load salary status." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET SALARY ACADEMIC YEARS
// ═══════════════════════════════════════════════════════════════════════

export async function getSalaryAcademicYears() {
  await requireRole("ADMIN", "CASHIER");
  try {
    const rows = await prisma.employeeSalaryPayment.findMany({
      distinct: ["academicYear"],
      select:   { academicYear: true },
      orderBy:  { academicYear: "desc" },
    });
    return rows.map((r) => r.academicYear);
  } catch {
    return [];
  }
}