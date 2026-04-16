"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

// ── Helper: generate invoice number ──────────────────────────────────────────
async function generateInvoiceNumber(schoolId: number): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.feePayment.count({
    where: { 
      invoiceNumber: { startsWith: `INV-${year}-` },
      schoolId: schoolId
    },
  });
  const seq = String(count + 1).padStart(5, "0");
  return `INV-${year}-${seq}`;
}

// ── Helper: check role and get schoolId ────────────────────────────────────────
async function requireRoleAndSchool(...roles: string[]) {
  const { role, schoolId, userId } = await getUserRoleAuth();
  const normalizedRole = (role || "").toLowerCase();
  const normalizedAllowed = roles.map((r) => r.toLowerCase());
  
  if (!normalizedAllowed.includes(normalizedRole)) {
    throw new Error("Unauthorized: Insufficient permissions");
  }
  
  if (!schoolId) {
    throw new Error("No school found for this account");
  }
  
  return { role: normalizedRole, schoolId: Number(schoolId), userId };
}

// ═══════════════════════════════════════════════════════════════════════
// FEE TYPE CRUD (Admin only) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function createFeeType(data: {
  name: string;
  description?: string;
}) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin");

    const feeType = await prisma.feeType.create({
      data: {
        name: data.name,
        description: data.description,
        schoolId: schoolId,
      },
    });
    revalidatePath("/list/fees");
    return { success: true, data: feeType };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, error: "Fee type name already exists." };
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to create fee type." };
  }
}

export async function updateFeeType(
  id: number,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin");
    
    // Verify fee type belongs to this school
    const existing = await prisma.feeType.findFirst({
      where: { id, schoolId }
    });
    
    if (!existing) {
      return { success: false, error: "Fee type not found or belongs to different school." };
    }
    
    const feeType = await prisma.feeType.update({ 
      where: { id }, 
      data 
    });
    revalidatePath("/list/fees");
    return { success: true, data: feeType };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to update fee type." };
  }
}

export async function deleteFeeType(id: number) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin");
    
    // Verify fee type belongs to this school
    const existing = await prisma.feeType.findFirst({
      where: { id, schoolId }
    });
    
    if (!existing) {
      return { success: false, error: "Fee type not found or belongs to different school." };
    }
    
    await prisma.feeType.delete({ where: { id } });
    revalidatePath("/list/fees");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2003")
      return { success: false, error: "Cannot delete — fee type is in use." };
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to delete." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CLASS FEE STRUCTURE CRUD (Admin only) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function upsertClassFeeStructure(data: {
  classId: number;
  feeTypeId: number;
  amount: number;
  academicYear: string;
}) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin");

    // Verify class belongs to this school
    const classRow = await prisma.class.findFirst({
      where: { id: data.classId, schoolId: schoolId },
      select: { id: true },
    });

    if (!classRow) {
      return { success: false, error: "Selected class is not in your school." };
    }

    // Verify fee type belongs to this school
    const feeTypeRow = await prisma.feeType.findFirst({
      where: { id: data.feeTypeId, schoolId: schoolId },
      select: { id: true },
    });

    if (!feeTypeRow) {
      return { success: false, error: "Selected fee type is not in your school." };
    }

    const result = await prisma.classFeeStructure.upsert({
      where: {
        classId_feeTypeId_academicYear: {
          classId: data.classId,
          feeTypeId: data.feeTypeId,
          academicYear: data.academicYear,
        },
      },
      update: { amount: data.amount },
      create: {
        classId: data.classId,
        feeTypeId: data.feeTypeId,
        amount: data.amount,
        academicYear: data.academicYear,
        schoolId: schoolId,
      },
    });
    revalidatePath("/list/fees");
    revalidatePath(`/list/fees/structure/${data.classId}`);
    return { success: true, data: result };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to save fee structure." };
  }
}

export async function deleteClassFeeStructure(id: number) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin");
    
    // Verify structure belongs to this school
    const existing = await prisma.classFeeStructure.findFirst({
      where: { id, schoolId }
    });
    
    if (!existing) {
      return { success: false, error: "Fee structure not found or belongs to different school." };
    }
    
    await prisma.classFeeStructure.delete({ where: { id } });
    revalidatePath("/list/fees");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2003")
      return {
        success: false,
        error: "Cannot delete — payments exist for this fee.",
      };
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to delete." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// STUDENT SEARCH (Cashier) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function searchStudents(params: {
  studentId?: string;
  name?: string;
  classId?: number;
  rollNumber?: number;
  academicYear?: string;
}) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");

    const { studentId, name, classId, rollNumber, academicYear } = params;

    // If roll number provided, find via StudentClassHistory
    if (rollNumber && classId) {
      const year = academicYear || (() => {
        const y = new Date().getFullYear();
        return `${y}-${y + 1}`;
      })();

      const history = await prisma.studentClassHistory.findFirst({
        where: { 
          classId, 
          rollNumber, 
          academicYear: year, 
          class: { schoolId: schoolId } 
        },
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
          { schoolId: schoolId },
        ],
      },
      include: { class: { include: { grade: true } }, parent: true },
      take: 20,
      orderBy: { name: "asc" },
    });

    return { success: true, data: students.map((s) => formatStudent(s, null)) };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to search students." };
  }
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
// GET FEE STRUCTURE FOR STUDENT (with paid/unpaid status) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function getStudentFeeStatus(
  studentId: string,
  academicYear?: string
) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");

    const year = academicYear || (() => {
      const y = new Date().getFullYear();
      return `${y}-${y + 1}`;
    })();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: { include: { grade: true } } },
    });
    
    if (!student) return { success: false, error: "Student not found." };
    if (student.schoolId !== schoolId) {
      return { success: false, error: "Student is not in your school." };
    }

    // Get all fee structures for the student's class
    const structures = await prisma.classFeeStructure.findMany({
      where: { classId: student.classId, academicYear: year, schoolId: schoolId },
      include: { feeType: true },
      orderBy: { feeType: { name: "asc" } },
    });

    // Get all payments this student has made this academic year
    const payments = await prisma.feePayment.findMany({
      where: { studentId, academicYear: year, schoolId: schoolId },
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
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to get student fee status." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// RECORD PAYMENT (Cashier only) - SCHOOL WISE
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
  try {
    // ── 1. Auth + get cashier's userId and schoolId ────────────────────────────────────
    const { role, schoolId, userId: cashierId } = await requireRoleAndSchool("admin", "cashier");
    
    // Ensure cashierId is not null/undefined
    if (!cashierId) {
      return { success: false, error: "User ID not found. Please log in again." };
    }

    // ── 2. Validate fee structure belongs to school ─────────────────────────────────────────
    const structure = await prisma.classFeeStructure.findFirst({
      where: { 
        id: data.classFeeStructureId, 
        schoolId: schoolId 
      },
      include: { feeType: true },
    });
    
    if (!structure) {
      return { success: false, error: "Fee structure not found for your school." };
    }
    
    if (structure.academicYear !== data.academicYear) {
      return { success: false, error: "Selected fee type does not belong to this session." };
    }

    // ── 3. Validate student belongs to school ───────────────────────────────────────────────
    const student = await prisma.student.findUnique({ 
      where: { id: data.studentId } 
    });
    
    if (!student) {
      return { success: false, error: "Student not found." };
    }
    
    if (student.schoolId !== schoolId) {
      return { success: false, error: "Student is not in your school." };
    }

    // ── 4. Validate cashier exists in Employee table with matching schoolId ─────────────────
    const employeeExists = await prisma.employee.findFirst({
      where: { 
        id: cashierId,  // Add this to check by ID
        schoolId: schoolId
      },
      select: { id: true },
    });

    if (!employeeExists) {
      return {
        success: false,
        error: `You are not registered as an employee in this school. Please contact your system administrator.`,
      };
    }

    // ── 5. Generate invoice number with uniqueness check ────────────────────────────────────
   // ── 5. Generate invoice number with uniqueness check ────────────────────────────────────
    let invoiceNumber: string = ""; // ইনিশিয়ালাইজ করা হলো
    let attempts = 0;
    const maxAttempts = 15; // চেষ্টার সংখ্যা বাড়িয়ে ১৫ করা হলো
    
    while (attempts < maxAttempts) {
      // ইনভয়েস নম্বর জেনারেট করা হচ্ছে
      invoiceNumber = await generateInvoiceNumber(schoolId);
      
      // ডুপ্লিকেট চেক
      const existing = await prisma.feePayment.findUnique({
        where: { invoiceNumber: invoiceNumber }
      });
      
      if (!existing) {
        break; // ইউনিক নম্বর পাওয়া গেছে, লুপ থেকে বের হয়ে যাও
      }
      
      attempts++;
      
      // যদি অনেকবার চেষ্টা করেও ডুপ্লিকেট পায়, তবে নম্বরের শেষে সেকেন্ডের অংশ যোগ করে ইউনিক করা
      if (attempts > 5) {
        invoiceNumber += `-${Math.floor(Math.random() * 1000)}`;
      }

      if (attempts === maxAttempts) {
        // একদম শেষ চেষ্টা হিসেবে টাইমস্ট্যাম্প ব্যবহার
        invoiceNumber = `INV-${Date.now()}`;
      }
    }

    // ── 6. Create payment ─────────────────────────────────────────────────────────────────
    const payment = await prisma.feePayment.create({
      data: {
        invoiceNumber: invoiceNumber!,
        studentId: data.studentId,
        classId: structure.classId,
        classFeeStructureId: data.classFeeStructureId,
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod,
        academicYear: data.academicYear,
        monthLabel: data.monthLabel || null,
        collectedById: cashierId,  // Now cashierId is guaranteed to be string
        schoolId: schoolId,
        remarks: data.remarks,
      },
      include: {
        student: { include: { class: true } },
        classFeeStructure: { include: { feeType: true } },
        collectedBy: { select: { name: true, surname: true } },
      },
    });

    const collectedByName = payment.collectedBy
      ? `${payment.collectedBy.name} ${payment.collectedBy.surname}`.trim()
      : "Admin";

    revalidatePath("/list/fees/cashier");
    revalidatePath(`/list/students/${data.studentId}`);

    return {
      success: true,
      data: {
        id: payment.id,
        invoiceNumber: payment.invoiceNumber,
        studentName: `${payment.student.name} ${payment.student.surname}`,
        className: payment.student.class?.name ?? "",
        feeTypeName: payment.classFeeStructure.feeType.name,
        amountPaid: payment.amountPaid,
        paymentMethod: payment.paymentMethod,
        monthLabel: payment.monthLabel,
        paidAt: payment.paidAt.toISOString(),
        collectedBy: collectedByName,
        academicYear: payment.academicYear,
      },
    };
  } catch (e: any) {
    console.error("[recordPayment] error:", e);
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    if (e?.code === "P2002") {
      return { success: false, error: "Duplicate invoice number generated. Please try again." };
    }
    return { success: false, error: "Failed to record payment: " + (e?.message || "Unknown error") };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET FEE COLLECTION SESSIONS - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function getFeeCollectionSessions() {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");

    const [school, structures, payments] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { academicSession: true },
      }),
      prisma.classFeeStructure.findMany({
        where: { schoolId: schoolId },
        select: { academicYear: true },
        distinct: ["academicYear"],
        orderBy: { academicYear: "desc" },
      }),
      prisma.feePayment.findMany({
        where: { schoolId: schoolId },
        select: { academicYear: true
         },
        distinct: ["academicYear"],
        orderBy: { academicYear: "desc" },
      }),
    ]);

    const values = new Set<string>([
      ...structures.map((s) => s.academicYear),
      ...payments.map((p) => p.academicYear),
    ]);
    if (school?.academicSession) values.add(school.academicSession);
    return [...values].sort((a, b) => b.localeCompare(a));
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return [];
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET PAYMENT HISTORY (for student profile) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function getStudentPaymentHistory(
  studentId: string,
  academicYear?: string
) {
  try {
    const { schoolId, role } = await requireRoleAndSchool("admin", "cashier", "teacher", "student", "parent");

    // For parent/student, verify they have access to this student
    if (role === "parent") {
      const student = await prisma.student.findFirst({
        where: { id: studentId, parentId: (await requireRoleAndSchool("parent")).userId }
      });
      if (!student) {
        return { success: false, error: "You don't have access to this student's payment history." };
      }
    } else if (role === "student") {
      const currentUserId = (await requireRoleAndSchool("student")).userId;
      if (studentId !== currentUserId) {
        return { success: false, error: "You can only view your own payment history." };
      }
    }

    const where: { studentId: string; academicYear?: string; schoolId: number } = { 
      studentId, 
      schoolId 
    };
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
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        feeTypeName: p.classFeeStructure?.feeType?.name ?? "Unknown",
        amountPaid: p.amountPaid,
        paymentMethod: p.paymentMethod,
        academicYear: p.academicYear,
        monthLabel: p.monthLabel,
        paidAt: p.paidAt.toISOString(),
        collectedBy: p.collectedBy
          ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim()
          : "",
      })),
    };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to get payment history." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET SINGLE INVOICE (for PDF generation) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function getInvoiceById(invoiceNumber: string) {
  try {
    const { schoolId, role } = await requireRoleAndSchool("admin", "cashier", "teacher", "student", "parent");

    const payment = await prisma.feePayment.findFirst({
      where: { 
        invoiceNumber,
        schoolId: schoolId 
      },
      include: {
        student: {
          include: {
            class: { include: { grade: true } },
            parent: true,
          },
        },
        classFeeStructure: { include: { feeType: true } },
        collectedBy: { select: { name: true, surname: true } },
      },
    });

    if (!payment) return { success: false, error: "Invoice not found." };

    // Verify access for parent/student
    if (role === "parent") {
      const student = await prisma.student.findFirst({
        where: { id: payment.studentId, parentId: (await requireRoleAndSchool("parent")).userId }
      });
      if (!student) {
        return { success: false, error: "You don't have access to this invoice." };
      }
    } else if (role === "student") {
      const currentUserId = (await requireRoleAndSchool("student")).userId;
      if (payment.studentId !== currentUserId) {
        return { success: false, error: "You can only view your own invoices." };
      }
    }

    const history = await prisma.studentClassHistory.findFirst({
      where: { studentId: payment.studentId, academicYear: payment.academicYear },
      select: { rollNumber: true },
    });

    const parent = payment.student.parent;
    const fatherName = parent
      ? `${parent.name ?? ""} ${parent.surname ?? ""}`.trim() || null
      : null;

    const collectedByName = payment.collectedBy
      ? `${payment.collectedBy.name} ${payment.collectedBy.surname}`.trim()
      : "Admin";

    return {
      success: true,
      data: {
        invoiceNumber: payment.invoiceNumber,
        studentId: payment.student.id,
        studentName: `${payment.student.name} ${payment.student.surname}`,
        fatherName,
        className: payment.student.class?.name ?? "",
        gradeLevel: payment.student.class?.grade?.level ?? null,
        rollNumber: history?.rollNumber ?? null,
        feeTypeName: payment.classFeeStructure.feeType.name,
        amountPaid: Number(payment.amountPaid),
        paymentMethod: payment.paymentMethod,
        monthLabel: payment.monthLabel,
        academicYear: payment.academicYear,
        paidAt: payment.paidAt.toISOString(),
        collectedBy: collectedByName,
      },
    };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to get invoice." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET ALL PAYMENTS (for payment list page) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function getAllPayments(params: {
  studentName?: string;
  classId?: number;
  academicYear?: string;
  fromDate?: string;
  toDate?: string;
  paymentMethod?: string;
}) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");

    const where: any = { schoolId: schoolId };

    if (params.academicYear) where.academicYear = params.academicYear;
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
          { name: { contains: params.studentName, mode: "insensitive" } },
          { surname: { contains: params.studentName, mode: "insensitive" } },
        ],
      };
    }

    const payments = await prisma.feePayment.findMany({
      where,
      include: {
        student: { include: { class: true } },
        classFeeStructure: { include: { feeType: true } },
        collectedBy: { select: { name: true, surname: true } },
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
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        studentId: p.studentId,
        studentName: `${p.student.name} ${p.student.surname}`,
        className: p.student.class?.name ?? "",
        feeTypeName: p.classFeeStructure.feeType.name,
        amountPaid: p.amountPaid,
        paymentMethod: p.paymentMethod,
        academicYear: p.academicYear,
        monthLabel: p.monthLabel,
        paidAt: p.paidAt.toISOString(),
        collectedBy: p.collectedBy
          ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim()
          : "",
      })),
    };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to get payments." };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET ALL ACADEMIC YEARS (for filter dropdown) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function getAcademicYears() {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier");
    
    const rows = await prisma.feePayment.findMany({
      where: { schoolId: schoolId },
      distinct: ["academicYear"],
      select: { academicYear: true },
      orderBy: { academicYear: "desc" },
    });
    return rows.map((r) => r.academicYear);
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return [];
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET FULL INVOICE DATA FOR PDF (student/parent safe) - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function getFullInvoiceForPDF(invoiceNumber: string) {
  // Same as getInvoiceById - alias for PDF generation
  return getInvoiceById(invoiceNumber);
}

// ═══════════════════════════════════════════════════════════════════════
// GET PARENT'S CHILDREN + ALL THEIR PAYMENTS - SCHOOL WISE
// ═══════════════════════════════════════════════════════════════════════

export async function getParentStudentsPayments(
  parentId: string,
  academicYear?: string
) {
  try {
    const { schoolId } = await requireRoleAndSchool("admin", "cashier", "parent");

    // Verify parent belongs to this school
    const parent = await prisma.parent.findFirst({
      where: { id: parentId, schoolId: schoolId }
    });
    
    if (!parent) {
      return { success: false, error: "Parent not found in this school." };
    }

    const students = await prisma.student.findMany({
      where: { 
        parentId,
        schoolId: schoolId 
      },
      include: {
        class: { include: { grade: true } },
        feePayments: {
          where: academicYear ? { academicYear, schoolId: schoolId } : { schoolId: schoolId },
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
        id: s.id,
        name: s.name,
        surname: s.surname,
        img: s.img,
        className: s.class?.name ?? "",
        gradeLevel: s.class?.grade?.level ?? null,
        totalPaid: s.feePayments.reduce((sum, p) => sum + p.amountPaid, 0),
        payments: s.feePayments.map((p) => ({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          feeTypeName: p.classFeeStructure?.feeType?.name ?? "Unknown",
          amountPaid: p.amountPaid,
          paymentMethod: p.paymentMethod,
          academicYear: p.academicYear,
          monthLabel: p.monthLabel,
          paidAt: p.paidAt.toISOString(),
          collectedBy: p.collectedBy
            ? `${p.collectedBy.name} ${p.collectedBy.surname}`.trim()
            : "",
        })),
      })),
    };
  } catch (e: any) {
    if (e?.message?.includes("Unauthorized")) return { success: false, error: e.message };
    return { success: false, error: "Failed to get parent students payments." };
  }
}