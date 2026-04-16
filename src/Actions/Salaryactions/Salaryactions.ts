"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

// ── Helpers ────────────────────────────────────────────────────────────────

async function requireRole(...roles: string[]) {
  const { role, schoolId } = await getUserRoleAuth();
  const hasAccess = roles.some((r) => r.toUpperCase() === role?.toUpperCase());
  if (!hasAccess) throw new Error("Unauthorized");
  if (!schoolId) throw new Error("School not assigned to this user.");
  return { role, schoolId: Number(schoolId) };
}

// Session userId (emp_xxx) → Employee DB id খোঁজে বের করে
async function resolveEmployeeId(userId: string, schoolId: number): Promise<{ id: string; name: string }> {
  // প্রথমে direct id দিয়ে চেষ্টা
  let emp = await prisma.employee.findFirst({
    where: { id: userId, schoolId },
    select: { id: true, name: true, surname: true },
  });

  // না পেলে username দিয়ে চেষ্টা (session userId হয়তো username হিসেবে store)
  if (!emp) {
    emp = await prisma.employee.findFirst({
      where: { username: userId, schoolId },
      select: { id: true, name: true, surname: true },
    });
  }

  // যেকোনো school এ খোঁজো (schoolId match না হলেও)
  if (!emp) {
    emp = await prisma.employee.findFirst({
      where: { OR: [{ id: userId }, { username: userId }] },
      select: { id: true, name: true, surname: true },
    });
  }

  // ফলব্যাক: School এর first admin/cashier ব্যবহার করো
  if (!emp) {
    emp = await prisma.employee.findFirst({
      where: { 
        schoolId,
        role: { in: ["ADMIN", "CASHIER"] }
      },
      select: { id: true, name: true, surname: true },
      orderBy: { createdAt: "asc" }
    });
  }

  // Finally বিঁধি হলে userId টাই return করুন একটা placeholder নাম সহ
  if (!emp) {
    console.warn(`Employee not found for session userId: ${userId}, using userId as processedById`);
    return {
      id: userId,
      name: "System Payment",
    };
  }

  return {
    id: emp.id,
    name: `${emp.name} ${(emp as any).surname ?? ""}`.trim(),
  };
}

async function generateSalaryInvoice(schoolId: number): Promise<string> {
  const year = new Date().getFullYear();
  
  // Use a transaction with retry logic to handle race conditions
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      // Get the current max invoice number for this year
      const lastInvoice = await prisma.employeeSalaryPayment.findFirst({
        where: {
          schoolId,
          invoiceNumber: { startsWith: `SAL-${year}-` },
        },
        orderBy: {
          invoiceNumber: 'desc',
        },
        select: { invoiceNumber: true },
      });
      
      let nextNumber = 1;
      if (lastInvoice) {
        const match = lastInvoice.invoiceNumber.match(/-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      const invoiceNumber = `SAL-${year}-${String(nextNumber).padStart(5, "0")}`;
      
      // Check if this invoice number already exists (just in case)
      const existing = await prisma.employeeSalaryPayment.findUnique({
        where: { invoiceNumber },
      });
      
      if (!existing) {
        return invoiceNumber;
      }
      
      attempts++;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) throw error;
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Fallback with timestamp to ensure uniqueness
  return `SAL-${year}-${Date.now()}`;
}

async function getProcessedByDetails(processedById: string): Promise<string> {
  try {
    const emp = await prisma.employee.findUnique({
      where: { id: processedById },
      select: { name: true, surname: true, username: true },
    });
    if (emp) return `${emp.name} ${emp.surname ?? ""}`.trim() || emp.username || "Unknown";
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SALARY TYPE CRUD
// ═══════════════════════════════════════════════════════════════════════

export async function createSalaryType(data: {
  name: string;
  description?: string;
  isRecurring?: boolean;
}) {
  const { schoolId } = await requireRole("ADMIN");
  try {
    const st = await prisma.salaryType.create({
      data: { ...data, schoolId },
    });
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
  const { schoolId } = await requireRole("ADMIN");
  try {
    const existing = await prisma.salaryType.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Not found or access denied." };

    const st = await prisma.salaryType.update({ where: { id }, data });
    revalidatePath("/list/salary");
    return { success: true, data: st };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, error: "Name already exists." };
    return { success: false, error: "Failed to update salary type." };
  }
}

export async function deleteSalaryType(id: number) {
  const { schoolId } = await requireRole("ADMIN");
  try {
    const existing = await prisma.salaryType.findFirst({ where: { id, schoolId } });
    if (!existing) return { success: false, error: "Not found or access denied." };

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
// EMPLOYEE SALARY STRUCTURE CRUD
// ═══════════════════════════════════════════════════════════════════════

export async function upsertEmployeeSalaryStructure(data: {
  employeeId: string;
  salaryTypeId: number;
  amount: number;
}) {
  const { schoolId } = await requireRole("ADMIN");
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, schoolId },
    });
    if (!employee) return { success: false, error: "Employee not found in your school." };

    const record = await prisma.employeeSalaryStructure.upsert({
      where: {
        employeeId_salaryTypeId: {
          employeeId: data.employeeId,
          salaryTypeId: data.salaryTypeId,
        },
      },
      update: { amount: data.amount },
      create: {
        employeeId: data.employeeId,
        salaryTypeId: data.salaryTypeId,
        amount: data.amount,
        schoolId, // ← schema তে আছে কিন্তু relation নেই, direct value দিন
      },
    });
    // revalidatePath("/list/salary");
    return { success: true, data: record };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: "Failed to save salary structure." };
  }
}

export async function deleteEmployeeSalaryStructure(id: number) {
  const { schoolId } = await requireRole("ADMIN");
  try {
    const structure = await prisma.employeeSalaryStructure.findFirst({
      where: { id, schoolId },
    });
    if (!structure) return { success: false, error: "Not found or access denied." };

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
// EMPLOYEE SEARCH
// ═══════════════════════════════════════════════════════════════════════

export async function searchEmployees(params: {
  name?: string;
  employeeId?: string;
  subjectId?: number;
}) {
  const { schoolId } = await requireRole("ADMIN", "CASHIER");
  try {
    const employees = await prisma.employee.findMany({
      where: {
        schoolId,
        AND: [
          params.name
            ? {
                OR: [
                  { name: { contains: params.name, mode: "insensitive" } },
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
        subjects: { select: { id: true, name: true } },
        salaryStructures: {
          where: { schoolId },
          include: { salaryType: true },
        },
      },
      orderBy: { name: "asc" },
      take: 30,
    });

    return {
      success: true,
      data: employees.map((e) => ({
        id: e.id,
        name: e.name,
        surname: e.surname,
        img: e.img,
        phone: e.phone,
        subjects: e.subjects.map((s) => s.name),
        salaryStructures: e.salaryStructures.map((s) => ({
          id: s.id,
          salaryTypeId: s.salaryTypeId,
          salaryTypeName: s.salaryType.name,
          amount: Number(s.amount),
        })),
      })),
    };
  } catch {
    return { success: false, error: "Search failed." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET EMPLOYEE SALARY STATUS
// ═══════════════════════════════════════════════════════════════════════

export async function getEmployeeSalaryStatus(employeeId: string, academicYear: string) {
  const { schoolId } = await requireRole("ADMIN", "CASHIER");
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId },
      include: {
        salaryStructures: {
          where: { schoolId },
          include: { salaryType: true },
        },
        salaryPayments: {
          where: { academicYear, schoolId },
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
        structureId: structure.id,
        salaryTypeId: structure.salaryTypeId,
        salaryTypeName: structure.salaryType.name,
        isRecurring: structure.salaryType.isRecurring,
        amount: Number(structure.amount),
        totalPaid,
        payments: structurePayments.map((p) => ({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          amountPaid: Number(p.amountPaid),
          paymentMethod: p.paymentMethod,
          monthLabel: p.monthLabel,
          paidAt: p.paidAt.toISOString(),
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
// RECORD SALARY PAYMENT  ← মূল সমস্যা এখানে ছিল
// ═══════════════════════════════════════════════════════════════════════

export async function recordSalaryPayment(data: {
  employeeId: string;
  salaryTypeId: number;
  salaryStructureId?: number;
  amountPaid: number;
  paymentMethod: "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER";
  academicYear: string;
  monthLabel?: string;

}) {
  const { schoolId } = await requireRole("ADMIN", "CASHIER");
  const { userId } = await getUserRoleAuth();

  if (!userId) return { success: false, error: "Unauthorized: Not logged in." };

  let processedById: string;
  let processedByName: string;

  try {
    // userId (emp_xxx session id) → actual Employee record (with fallback enabled)
    const resolved = await resolveEmployeeId(userId, schoolId);
    processedById = resolved.id;
    processedByName = resolved.name;
    
    // Validate that processedById exists in the school
    const processor = await prisma.employee.findFirst({
      where: { id: processedById, schoolId }
    });
    
    if (!processor) {
      return { 
        success: false, 
        error: "Processor employee not found. Please ensure your account is active in the system." 
      };
    }
  } catch (e: any) {
    console.error("resolveEmployeeId error:", e.message);
    return { 
      success: false, 
      error: `Payment processor error: ${e.message}. Please contact your administrator.`
    };
  }

  try {
    // Target employee এই school এর কিনা verify
    const targetEmployee = await prisma.employee.findFirst({
      where: { id: data.employeeId, schoolId },
    });
    if (!targetEmployee) return { success: false, error: "Employee not found in your school." };

    const invoiceNumber = await generateSalaryInvoice(schoolId);

    const payment = await prisma.employeeSalaryPayment.create({
      data: {
        invoiceNumber,
        schoolId,
        employeeId: data.employeeId,
        salaryTypeId: data.salaryTypeId,
        salaryStructureId: data.salaryStructureId ?? null,
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        academicYear: data.academicYear,
        monthLabel: data.monthLabel ?? null,
        
        processedById,
      },
      include: {
        employee: true,
        salaryType: true,
        processedBy: true,
      },
    });

    // revalidatePath("/list/salary");
    // revalidatePath("/list/salary/cashier");
    // revalidatePath("/list/salary/payments");

    return {
      success: true,
      data: {
        ...payment,
        amountPaid: Number(payment.amountPaid),
        paidAt: payment.paidAt.toISOString(),
        processedBy: payment.processedBy
          ? `${payment.processedBy.name} ${payment.processedBy.surname ?? ""}`.trim()
          : processedByName,
      },
    };
  } catch (e: any) {
    console.error("recordSalaryPayment error:", e);
    return { success: false, error: "Database error: " + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET ALL SALARY PAYMENTS
// ═══════════════════════════════════════════════════════════════════════

export async function getAllSalaryPayments(params: {
  teacherName?: string;
  salaryTypeId?: number;
  academicYear?: string;
  fromDate?: string;
  toDate?: string;
  paymentMethod?: string;
}) {
  const { schoolId } = await requireRole("ADMIN", "CASHIER");

  const where: any = { schoolId };
  if (params.academicYear) where.academicYear = params.academicYear;
  if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
  if (params.salaryTypeId) where.salaryTypeId = params.salaryTypeId;

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
    where.employee = {
      schoolId,
      OR: [
        { name: { contains: params.teacherName, mode: "insensitive" } },
        { surname: { contains: params.teacherName, mode: "insensitive" } },
      ],
    };
  }

  const payments = await prisma.employeeSalaryPayment.findMany({
    where,
    include: {
      employee: true,
      salaryType: true,
      processedBy: true,
    },
    orderBy: { paidAt: "desc" },
    take: 500,
  });

  const totalAmount = payments.reduce((s, p) => s + parseFloat(p.amountPaid.toString()), 0);

  return {
    success: true,
    totalAmount,
    count: payments.length,
    data: payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      employeeId: p.employeeId,
      employeeName: `${p.employee.name} ${p.employee.surname ?? ""}`.trim(),
      employeeImg: p.employee.img,
      salaryTypeName: p.salaryType.name,
      amountPaid: Number(p.amountPaid),
      paymentMethod: p.paymentMethod as string,
      academicYear: p.academicYear,
      monthLabel: p.monthLabel,
      paidAt: p.paidAt.toISOString(),
      processedBy: p.processedBy
        ? `${p.processedBy.name} ${p.processedBy.surname ?? ""}`.trim()
        : "—",
      
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET FULL INVOICE FOR PDF
// ═══════════════════════════════════════════════════════════════════════

export async function getFullSalaryInvoiceForPDF(invoiceNumber: string) {
  const { schoolId } = await requireRole("ADMIN", "CASHIER", "TEACHER");

  const payment = await prisma.employeeSalaryPayment.findFirst({
    where: { invoiceNumber, schoolId },
    include: {
      employee: { include: { subjects: true } },
      salaryType: true,
      processedBy: true,
    },
  });

  if (!payment) return { success: false, error: "Invoice not found." };

  // School info আনুন
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { schoolName: true, address: true, phone: true },
  });

  let processedByName = "—";
  if (payment.processedBy) {
    processedByName = `${payment.processedBy.name} ${payment.processedBy.surname ?? ""}`.trim();
  } else if (payment.processedById) {
    processedByName = await getProcessedByDetails(payment.processedById);
  }

  return {
    success: true,
    data: {
      invoiceNumber: payment.invoiceNumber,
      employeeId: payment.employee.id,
      employeeName: `${payment.employee.name} ${payment.employee.surname ?? ""}`.trim(),
      employeePhone: payment.employee.phone,
      employeeEmail: payment.employee.email,
      employeeImg: payment.employee.img,
      salaryTypeName: payment.salaryType.name,
      isRecurring: payment.salaryType.isRecurring,
      amountPaid: Number(payment.amountPaid),
      paymentMethod: payment.paymentMethod as string,
      monthLabel: payment.monthLabel,
      academicYear: payment.academicYear,
      paidAt: payment.paidAt.toISOString(),
      processedBy: processedByName,
      processedById: payment.processedById,
      
      // DB থেকে real school info
      schoolName: school?.schoolName ?? "School Name",
      schoolAddress: school?.address ?? "School Address",
      schoolPhone: school?.phone ?? "—",
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET TEACHER SALARY STATUS (self-view)
// ═══════════════════════════════════════════════════════════════════════

export async function getTeacherSalaryStatus(employeeId: string, academicYear?: string) {
  const { schoolId } = await requireRole("ADMIN", "CASHIER", "TEACHER");

  const year = academicYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  try {
    const employeeExists = await prisma.employee.findFirst({
      where: { id: employeeId, schoolId },
    });
    if (!employeeExists) return { success: false, error: "Employee not found in your school." };

    const structures = await prisma.employeeSalaryStructure.findMany({
      where: { employeeId, schoolId },
      include: { salaryType: true },
    });

    const payments = await prisma.employeeSalaryPayment.findMany({
      where: { employeeId, academicYear: year, schoolId },
      include: { salaryType: true },
      orderBy: { paidAt: "desc" },
    });

    const salaryStatus = structures.map((s) => {
      const structurePayments = payments.filter((p) => p.salaryStructureId === s.id);
      const totalPaid = structurePayments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

      return {
        structureId: s.id,
        salaryTypeId: s.salaryTypeId,
        salaryTypeName: s.salaryType?.name ?? "N/A",
        isRecurring: s.salaryType?.isRecurring ?? false,
        amount: Number(s.amount),
        totalPaid,
        payments: structurePayments.map((p) => ({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          amountPaid: Number(p.amountPaid),
          paymentMethod: p.paymentMethod,
          monthLabel: p.monthLabel,
          paidAt: p.paidAt.toISOString(),
          processedById: p.processedById,
        })),
      };
    });

    return {
      success: true,
      data: {
        salaryStatus,
        totalConfigured: structures.reduce((s, r) => s + Number(r.amount), 0),
        totalPaid: payments.reduce((s, p) => s + Number(p.amountPaid), 0),
        academicYear: year,
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
  const { schoolId } = await requireRole("ADMIN", "CASHIER");
  try {
    const rows = await prisma.employeeSalaryPayment.findMany({
      where: { schoolId },
      distinct: ["academicYear"],
      select: { academicYear: true },
      orderBy: { academicYear: "desc" },
    });
    return rows.map((r) => r.academicYear);
  } catch {
    return [];
  }
}