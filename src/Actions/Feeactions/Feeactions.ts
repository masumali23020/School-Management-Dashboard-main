"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

import { getUserRoleAuth } from "@/lib/logsessition";

// ── Helper: generate invoice number ──────────────────────────────────────────

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.feePayment.count({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
  });
  const seq = String(count + 1).padStart(5, "0");
  return `INV-${year}-${seq}`;
}

// ── Helper: check role ────────────────────────────────────────────────────────

async function requireRole(...roles: string[]) {
   const { role } = await getUserRoleAuth();
  if (!roles.includes(role)) throw new Error("Unauthorized");
  return role;
}

// ═══════════════════════════════════════════════════════════════════════
// FEE TYPE CRUD (Admin only)
// ═══════════════════════════════════════════════════════════════════════

export async function createFeeType(data: {
  name: string;
  description?: string;
}) {
  await requireRole("admin", );
  try {
    const feeType = await prisma.feeType.create({ data });
    revalidatePath("/list/fees");
    return { success: true, data: feeType };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, error: "Fee type name already exists." };
    return { success: false, error: "Failed to create fee type." };
  }
}

export async function updateFeeType(
  id: number,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  await requireRole("admin");
  try {
    const feeType = await prisma.feeType.update({ where: { id }, data });
    revalidatePath("/list/fees");
    return { success: true, data: feeType };
  } catch {
    return { success: false, error: "Failed to update fee type." };
  }
}

export async function deleteFeeType(id: number) {
  await requireRole("admin");
  try {
    await prisma.feeType.delete({ where: { id } });
    revalidatePath("/list/fees");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2003")
      return { success: false, error: "Cannot delete — fee type is in use." };
    return { success: false, error: "Failed to delete." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CLASS FEE STRUCTURE CRUD (Admin only)
// ═══════════════════════════════════════════════════════════════════════

export async function upsertClassFeeStructure(data: {
  classId: number;
  feeTypeId: number;
  amount: number;
}) {
  await requireRole("admin");
  try {
    const result = await prisma.classFeeStructure.upsert({
      where: {
        classId_feeTypeId: {
          classId: data.classId,
          feeTypeId: data.feeTypeId,
        },
      },
      update: { amount: data.amount },
      create: {
        classId: data.classId,
        feeTypeId: data.feeTypeId,
        amount: data.amount,
      },
    });
    revalidatePath("/list/fees");
    revalidatePath(`/list/fees/structure/${data.classId}`);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to save fee structure." };
  }
}

export async function deleteClassFeeStructure(id: number) {
  await requireRole("admin");
  try {
    await prisma.classFeeStructure.delete({ where: { id } });
    revalidatePath("/list/fees");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2003")
      return {
        success: false,
        error: "Cannot delete — payments exist for this fee.",
      };
    return { success: false, error: "Failed to delete." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// STUDENT SEARCH (Cashier)
// ═══════════════════════════════════════════════════════════════════════

export async function searchStudents(params: {
  studentId?: string;
  name?: string;
  classId?: number;
  rollNumber?: number;
  academicYear?: string;
}) {
  await requireRole("admin", "cashier");

  const { studentId, name, classId, rollNumber, academicYear } = params;

  // If roll number provided, find via StudentClassHistory
  if (rollNumber && classId) {
    const year =
      academicYear ||
      (() => {
        const y = new Date().getFullYear();
        return `${y}-${y + 1}`;
      })();

    const history = await prisma.studentClassHistory.findFirst({
      where: { classId, rollNumber, academicYear: year },
      include: {
        student: {
          include: { class: { include: { grade: true } }, parent: true },
        },
      },
    });

    if (!history) return { success: true, data: [] };
    return {
      success: true,
      data: [formatStudent(history.student, history.rollNumber)],
    };
  }

  // General search
  const students = await prisma.student.findMany({
    where: {
      AND: [
        studentId ? { id: { contains: studentId, mode: "insensitive" } } : {},
        name
          ? {
              OR: [
                { name: { contains: name, mode: "insensitive" } },
                { surname: { contains: name, mode: "insensitive" } },
              ],
            }
          : {},
        classId ? { classId } : {},
      ],
    },
    include: { class: { include: { grade: true } }, parent: true },
    take: 20,
    orderBy: { name: "asc" },
  });

  return { success: true, data: students.map((s) => formatStudent(s, null)) };
}

function formatStudent(s: any, roll: number | null) {
  return {
    id: s.id,
    name: s.name,
    surname: s.surname,
    img: s.img,
    phone: s.phone,
    classId: s.classId,
    className: s.class?.name,
    gradeLevel: s.class?.grade?.level,
    fatherName: s.parent?.name
      ? `${s.parent.name} ${s.parent.surname ?? ""}`.trim()
      : null,
    rollNumber: roll,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET FEE STRUCTURE FOR STUDENT (with paid/unpaid status)
// ═══════════════════════════════════════════════════════════════════════

export async function getStudentFeeStatus(
  studentId: string,
  academicYear?: string
) {
  await requireRole("admin", "cashier");

  const year =
    academicYear ||
    (() => {
      const y = new Date().getFullYear();
      return `${y}-${y + 1}`;
    })();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: { include: { grade: true } } },
  });
  if (!student) return { success: false, error: "Student not found." };

  // Get all fee structures for the student's class
  const structures = await prisma.classFeeStructure.findMany({
    where: { classId: student.classId },
    include: { feeType: true },
    orderBy: { feeType: { name: "asc" } },
  });

  // Get all payments this student has made this academic year
  const payments = await prisma.feePayment.findMany({
    where: { studentId, academicYear: year },
    include: {
      classFeeStructure: { include: { feeType: true } },
      collectedBy: { select: { name: true, surname: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  // Build paid map: feeStructureId → list of payments
  const paidMap: Record<number, typeof payments> = {};
  payments.forEach((p) => {
    if (!paidMap[p.classFeeStructureId]) paidMap[p.classFeeStructureId] = [];
    paidMap[p.classFeeStructureId].push(p);
  });

  const feeStatus = structures.map((s) => ({
    structureId: s.id,
    feeTypeId: s.feeTypeId,
    feeTypeName: s.feeType.name,
    amount: s.amount,
    payments: (paidMap[s.id] || []).map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      amountPaid: p.amountPaid,
      paymentMethod: p.paymentMethod,
      monthLabel: p.monthLabel,
      paidAt: p.paidAt.toISOString(),
      collectedBy: p.collectedBy
        ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim()
        : "",
    })),
    totalPaid: (paidMap[s.id] || []).reduce((sum, p) => sum + p.amountPaid, 0),
  }));

  return {
    success: true,
    data: {
      student: {
        id: student.id,
        name: student.name,
        surname: student.surname,
        img: student.img,
        classId: student.classId,
        className: student.class?.name,
        gradeLevel: student.class?.grade?.level,
      },
      academicYear: year,
      feeStatus,
      totalDue: feeStatus.reduce((sum, f) => sum + f.amount, 0),
      totalPaid: feeStatus.reduce((sum, f) => sum + f.totalPaid, 0),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// RECORD PAYMENT (Cashier only)
// ═══════════════════════════════════════════════════════════════════════

export async function recordPayment(data: {
  studentId: string;
  classFeeStructureId: number;
  amountPaid: number;
  paymentMethod: "CASH" | "MOBILE_BANKING" | "BANK_TRANSFER";
  academicYear: string;
  monthLabel?: string;
  remarks?: string;
}) {
  // ── 1. Auth + get cashier's userId ────────────────────────────────────
  let cashierId: string;
  try {
    const result = await getUserRoleAuth() as { role: string; userId: string };
    const { role, userId } = result;
    if (!["admin", "cashier"].includes(role)) {
      return { success: false, error: "AUTH_FAILED: You do not have permission to record payments." };
    }
    cashierId = userId;
  } catch {
    return { success: false, error: "AUTH_FAILED: Could not resolve user." };
  }

  // ── 2. Resolve cashier display name (for invoice response only) ───────
  let collectedByDisplayName = "Unknown";
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (clerkUser) {
      const firstName = clerkUser.firstName ?? "";
      const lastName  = clerkUser.lastName  ?? "";
      const fullName  = `${firstName} ${lastName}`.trim();
      if (fullName) {
        collectedByDisplayName = fullName;
      } else {
        // Fallback: look up in Employee table
        const employee = await prisma.employee.findUnique({
          where:  { id: cashierId },
          select: { name: true, surname: true },
        }).catch(() => null);

        if (employee) {
          collectedByDisplayName = `${employee.name} ${employee.surname}`.trim();
        } else {
          // Last resort: Admin table
          const admin = await prisma.admin.findUnique({
            where:  { id: cashierId },
            select: { username: true },
          }).catch(() => null);
          if (admin?.username) collectedByDisplayName = admin.username;
        }
      }
    }
  } catch {
    // Non-fatal — we'll still have the relation via collectedById
  }

  // ── 3. Validate fee structure ─────────────────────────────────────────
  let structure: { classId: number; feeType: { name: string } } | null = null;
  try {
    structure = await prisma.classFeeStructure.findUnique({
      where: { id: data.classFeeStructureId },
      include: { feeType: true },
    });
  } catch (e: any) {
    return { success: false, error: "DB_ERROR fetching fee structure: " + e.message };
  }
  if (!structure)
    return { success: false, error: "Fee structure not found for id: " + data.classFeeStructureId };

  // ── 4. Validate student ───────────────────────────────────────────────
  try {
    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student)
      return { success: false, error: "Student not found for id: " + data.studentId };
  } catch (e: any) {
    return { success: false, error: "DB_ERROR fetching student: " + e.message };
  }

  // ── 5. Validate cashier exists in Employee table ──────────────────────
  // The FeePayment.collectedById is a required FK to Employee.
  // If the logged-in user is an Admin (not in Employee table), we need a fallback.
  const employeeExists = await prisma.employee.findUnique({
    where: { id: cashierId },
    select: { id: true },
  }).catch(() => null);

  if (!employeeExists) {
    // Try to find any admin/cashier employee as fallback
    // (This handles the case where the logged-in user is in Admin table, not Employee)
    return {
      success: false,
      error: `The logged-in user (${cashierId}) does not exist in the Employee table. Only employees assigned as Cashier/Admin in the Employee table can record payments. Please contact your system administrator.`,
    };
  }

  // ── 6. Generate invoice number ────────────────────────────────────────
  let invoiceNumber: string;
  try {
    invoiceNumber = await generateInvoiceNumber();
  } catch (e: any) {
    return { success: false, error: "DB_ERROR generating invoice: " + e.message };
  }

  // ── 7. Create payment ─────────────────────────────────────────────────
  let paymentId: number;
  try {
    const payment = await prisma.feePayment.create({
      data: {
        invoiceNumber,
        studentId:           data.studentId,
        classId:             structure.classId,
        classFeeStructureId: data.classFeeStructureId,
        amountPaid:          data.amountPaid,
        paymentMethod:       data.paymentMethod,
        academicYear:        data.academicYear,
        monthLabel:          data.monthLabel || null,
        remarks:             data.remarks    || null,
        collectedById:       cashierId,       // ✅ proper FK to Employee
      },
    });
    paymentId = payment.id;
  } catch (e: any) {
    console.error("[recordPayment] create failed:", e);
    return {
      success: false,
      error: "DB_ERROR creating payment: " + (e?.message ?? String(e)),
    };
  }

  // ── 8. Fetch full record for response ─────────────────────────────────
  try {
    const full = await prisma.feePayment.findUnique({
      where: { id: paymentId },
      include: {
        student:           { include: { class: true } },
        classFeeStructure: { include: { feeType: true } },
        collectedBy:       { select: { name: true, surname: true } },
      },
    });

    if (!full) return { success: false, error: "Payment saved but retrieval failed." };

    const collectedByName = full.collectedBy
      ? `${full.collectedBy.name} ${full.collectedBy.surname}`.trim()
      : collectedByDisplayName;

    revalidatePath("/list/fees/cashier");
    revalidatePath(`/list/students/${data.studentId}`);

    return {
      success: true,
      data: {
        id:            full.id,
        invoiceNumber: full.invoiceNumber,
        studentName:   `${full.student.name} ${full.student.surname}`,
        className:     full.student.class?.name ?? "",
        feeTypeName:   full.classFeeStructure.feeType.name,
        amountPaid:    full.amountPaid,
        paymentMethod: full.paymentMethod,
        monthLabel:    full.monthLabel,
        paidAt:        full.paidAt.toISOString(),
        collectedBy:   collectedByName,
        academicYear:  full.academicYear,
      },
    };
  } catch (e: any) {
    return { success: false, error: "DB_ERROR fetching full payment: " + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET PAYMENT HISTORY (for student profile)
// ═══════════════════════════════════════════════════════════════════════

export async function getStudentPaymentHistory(
  studentId: string,
  academicYear?: string
) {
  await requireRole("admin", "cashier", "teacher", "student", "parent");

  const where: { studentId: string; academicYear?: string } = { studentId };
  if (academicYear) where.academicYear = academicYear;

  const payments = await prisma.feePayment.findMany({
    where,
    include: {
      classFeeStructure: { include: { feeType: true } },
      collectedBy: { select: { name: true, surname: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  return {
    success: true,
    data: payments.map((p) => ({
      id:            p.id,
      invoiceNumber: p.invoiceNumber,
      feeTypeName:   p.classFeeStructure?.feeType?.name ?? "Unknown",
      amountPaid:    p.amountPaid,
      paymentMethod: p.paymentMethod,
      academicYear:  p.academicYear,
      monthLabel:    p.monthLabel,
      paidAt:        p.paidAt.toISOString(),
      collectedBy: p.collectedBy
        ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim()
        : "",
      remarks: p.remarks,
    })),

    
  };
  
}

// ═══════════════════════════════════════════════════════════════════════
// GET SINGLE INVOICE (for PDF generation)
// ═══════════════════════════════════════════════════════════════════════

export async function getInvoiceById(invoiceNumber: string) {
  await requireRole("admin", "cashier", "teacher", "student", "parent");

  const payment = await prisma.feePayment.findUnique({
    where: { invoiceNumber },
    include: {
      student: {
        include: {
          class:  { include: { grade: true } },
          parent: true,
        },
      },
      classFeeStructure: { include: { feeType: true } },
      collectedBy: { select: { name: true, surname: true } },
    },
  });

  if (!payment) return { success: false, error: "Invoice not found." };

  const history = await prisma.studentClassHistory.findFirst({
    where: { studentId: payment.studentId, academicYear: payment.academicYear },
    select: { rollNumber: true },
  });

  const parent = (payment.student as any).parent;
  const fatherName = parent
    ? `${parent.name ?? ""} ${parent.surname ?? ""}`.trim() || null
    : null;

  const collectedByName = payment.collectedBy
    ? `${payment.collectedBy.name} ${payment.collectedBy.surname}`.trim()
    : "Admin";

  return {
    success: true,
    data: {
      invoiceNumber:  payment.invoiceNumber,
      studentId:      payment.student.id,
      studentName:    `${payment.student.name} ${payment.student.surname}`,
      fatherName,
      className:      payment.student.class?.name    ?? "",
      gradeLevel:     payment.student.class?.grade?.level ?? null,
      rollNumber:     history?.rollNumber ?? null,
      feeTypeName:    payment.classFeeStructure.feeType.name,
      amountPaid:     Number(payment.amountPaid),
      paymentMethod:  payment.paymentMethod,
      monthLabel:     payment.monthLabel,
      academicYear:   payment.academicYear,
      paidAt:         payment.paidAt.toISOString(),
      collectedBy:    collectedByName,
      remarks:        payment.remarks,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET ALL PAYMENTS (for payment list page)
// ═══════════════════════════════════════════════════════════════════════

export async function getAllPayments(params: {
  studentName?: string;
  classId?: number;
  academicYear?: string;
  fromDate?: string;
  toDate?: string;
  paymentMethod?: string;
}) {
  await requireRole("admin", "cashier");

  const where: any = {};

  if (params.academicYear)  where.academicYear  = params.academicYear;
  if (params.paymentMethod) where.paymentMethod = params.paymentMethod;

  if (params.fromDate || params.toDate) {
    where.paidAt = {};
    if (params.fromDate) where.paidAt.gte = new Date(params.fromDate);
    if (params.toDate) {
      const to = new Date(params.toDate);
      to.setHours(23, 59, 59, 999);
      where.paidAt.lte = to;
    }
  }

  if (params.classId) where.classId = params.classId;

  if (params.studentName) {
    where.student = {
      OR: [
        { name:    { contains: params.studentName, mode: "insensitive" } },
        { surname: { contains: params.studentName, mode: "insensitive" } },
      ],
    };
  }

  const payments = await prisma.feePayment.findMany({
    where,
    include: {
      student:           { include: { class: true } },
      classFeeStructure: { include: { feeType: true } },
      collectedBy:       { select: { name: true, surname: true } },
    },
    orderBy: { paidAt: "desc" },
    take: 500,
  });

  const totalAmount = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  return {
    success: true,
    totalAmount,
    count: payments.length,
    data: payments.map((p) => ({
      id:            p.id,
      invoiceNumber: p.invoiceNumber,
      studentId:     p.studentId,
      studentName:   `${p.student.name} ${p.student.surname}`,
      className:     p.student.class?.name ?? "",
      feeTypeName:   p.classFeeStructure.feeType.name,
      amountPaid:    p.amountPaid,
      paymentMethod: p.paymentMethod,
      academicYear:  p.academicYear,
      monthLabel:    p.monthLabel,
      paidAt:        p.paidAt.toISOString(),
      collectedBy: p.collectedBy
        ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim()
        : "",
      remarks: p.remarks,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET ALL ACADEMIC YEARS (for filter dropdown)
// ═══════════════════════════════════════════════════════════════════════

export async function getAcademicYears() {
  await requireRole("admin", "cashier");
  const rows = await prisma.feePayment.findMany({
    distinct: ["academicYear"],
    select:   { academicYear: true },
    orderBy:  { academicYear: "desc" },
  });
  return rows.map((r) => r.academicYear);
}

// ═══════════════════════════════════════════════════════════════════════
// GET FULL INVOICE DATA FOR PDF (student/parent safe)
// ═══════════════════════════════════════════════════════════════════════

export async function getFullInvoiceForPDF(invoiceNumber: string) {
  await requireRole("admin", "cashier", "teacher", "student", "parent");

  const payment = await prisma.feePayment.findUnique({
    where: { invoiceNumber },
    include: {
      student: {
        include: {
          class:  { include: { grade: true } },
          parent: true,
        },
      },
      classFeeStructure: { include: { feeType: true } },
      collectedBy: { select: { name: true, surname: true } },
    },
  });

  if (!payment) return { success: false, error: "Invoice not found." };

  const history = await prisma.studentClassHistory.findFirst({
    where: { studentId: payment.studentId, academicYear: payment.academicYear },
    select: { rollNumber: true },
  });

  const parent = (payment.student as any).parent;
  const fatherName = parent
    ? `${parent.name ?? ""} ${parent.surname ?? ""}`.trim() || null
    : null;

  const collectedByName = payment.collectedBy
    ? `${payment.collectedBy.name} ${payment.collectedBy.surname}`.trim()
    : "Admin";

  return {
    success: true,
    data: {
      invoiceNumber:  payment.invoiceNumber,
      studentId:      payment.student.id,
      studentName:    `${payment.student.name} ${payment.student.surname}`,
      fatherName,
      className:      payment.student.class?.name ?? "",
      gradeLevel:     payment.student.class?.grade?.level ?? null,
      rollNumber:     history?.rollNumber ?? null,
      feeTypeName:    payment.classFeeStructure.feeType.name,
      amountPaid:     Number(payment.amountPaid),
      paymentMethod:  payment.paymentMethod as string,
      monthLabel:     payment.monthLabel,
      academicYear:   payment.academicYear,
      paidAt:         payment.paidAt.toISOString(),
      collectedBy:    collectedByName,
      remarks:        payment.remarks,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// GET PARENT'S CHILDREN + ALL THEIR PAYMENTS
// ═══════════════════════════════════════════════════════════════════════

export async function getParentStudentsPayments(
  parentId: string,
  academicYear?: string
) {
  await requireRole("admin", "cashier", "parent");

  const students = await prisma.student.findMany({
    where: { parentId },
    include: {
      class: { include: { grade: true } },
      feePayments: {
        where: academicYear ? { academicYear } : {},
        include: {
          classFeeStructure: { include: { feeType: true } },
          collectedBy: { select: { name: true, surname: true } },
        },
        orderBy: { paidAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    success: true,
    data: students.map((s) => ({
      id:         s.id,
      name:       s.name,
      surname:    s.surname,
      img:        s.img,
      className:  s.class?.name ?? "",
      gradeLevel: s.class?.grade?.level ?? null,
      totalPaid:  s.feePayments.reduce((sum, p) => sum + p.amountPaid, 0),
      payments:   s.feePayments.map((p) => ({
        id:            p.id,
        invoiceNumber: p.invoiceNumber,
        feeTypeName:   p.classFeeStructure?.feeType?.name ?? "Unknown",
        amountPaid:    p.amountPaid,
        paymentMethod: p.paymentMethod as string,
        academicYear:  p.academicYear,
        monthLabel:    p.monthLabel,
        paidAt:        p.paidAt.toISOString(),
        collectedBy: p.collectedBy
          ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim()
          : "",
        remarks: p.remarks,
      })),
    })),
  };
}