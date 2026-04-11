// Actions/StudentActions/studentActions.ts
"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import prisma from "@/lib/db";
import { studentSchema, type StudentSchema } from "@/lib/FormValidationSchema";
import { requireSession } from "@/lib/get-session";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

type ActionState = { success: boolean; error: boolean; message?: string };

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createStudent = async (
  _state: ActionState,
  data: StudentSchema
): Promise<ActionState> => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    if (!schoolId) {
      return { success: false, error: true, message: "No school associated with this account." };
    }

    // Server-side re-validate
    const parsed = studentSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[createStudent] Zod errors:", parsed.error.flatten());
      return {
        success: false,
        error: true,
        message: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(", "),
      };
    }

    const d = parsed.data;

    if (!d.password) {
      return { success: false, error: true, message: "Password is required." };
    }

    // Check if class belongs to this school
    const classItem = await prisma.class.findFirst({
      where: { 
        id: d.classId,
        schoolId: schoolId 
      },
      include: { _count: { select: { students: true } } },
    });

    if (!classItem) {
      return { success: false, error: true, message: "Class not found in your school." };
    }

    // Check class capacity
    if (classItem.capacity === classItem._count.students) {
      return { success: false, error: true, message: "Class is full. Cannot add more students." };
    }

    // Check if grade belongs to this school
    const gradeItem = await prisma.grade.findFirst({
      where: { 
        id: d.gradeId,
        schoolId: schoolId 
      },
    });

    if (!gradeItem) {
      return { success: false, error: true, message: "Grade not found in your school." };
    }

    // Check if parent belongs to this school (if parentId provided)
    if (d.parentId) {
      const parent = await prisma.parent.findFirst({
        where: { 
          id: d.parentId,
          schoolId: schoolId 
        },
      });
      if (!parent) {
        return { success: false, error: true, message: "Parent not found in your school." };
      }
    }

    // Check if username already exists in this school
    const existingUser = await prisma.student.findFirst({
      where: { 
        username: d.username,
        schoolId: schoolId,
      },
    });
    
    if (existingUser) {
      return { success: false, error: true, message: "Username already taken." };
    }

    // Check if email already exists in this school
    if (d.email) {
      const existingEmail = await prisma.student.findFirst({
        where: { 
          email: d.email,
          schoolId: schoolId,
        },
      });
      if (existingEmail) {
        return { success: false, error: true, message: "Email already in use." };
      }
    }

    // Check if phone already exists in this school
    if (d.phone) {
      const existingPhone = await prisma.student.findFirst({
        where: { 
          phone: d.phone,
          schoolId: schoolId,
        },
      });
      if (existingPhone) {
        return { success: false, error: true, message: "Phone number already in use." };
      }
    }

    const hashedPassword = await bcrypt.hash(d.password, 12);

    await prisma.student.create({
      data: {
        id:        `stu_${nanoid(12)}`,
        schoolId,
        username:  d.username,
        password:  hashedPassword,
        name:      d.name,
        surname:   d.surname,
        email:     d.email     || null,
        phone:     d.phone     || null,
        address:   d.address,
        img:       d.img       || null,
        bloodType: d.bloodType,
        sex:       d.sex,
        birthday:  new Date(d.birthday),
        gradeId:   d.gradeId,
        classId:   d.classId,
        parentId:  d.parentId  || null,
      },
    });

    // revalidatePath("/list/students");
    return { success: true, error: false, message: "Student created successfully" };
  } catch (err: unknown) {
    console.error("[createStudent]", err);
    if (isPrismaUniqueError(err)) {
      return { success: false, error: true, message: uniqueMessage(err) };
    }
    return { success: false, error: true, message: "Failed to create student." };
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateStudent = async (
  _state: ActionState,
  data: StudentSchema
): Promise<ActionState> => {
  if (!data.id) return { success: false, error: true, message: "Missing ID." };

  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    if (!schoolId) {
      return { success: false, error: true, message: "No school associated with this account." };
    }

    // Verify student exists and belongs to this school
    const existingStudent = await prisma.student.findFirst({
      where: { 
        id: data.id,
        schoolId: schoolId 
      },
    });

    if (!existingStudent) {
      return { success: false, error: true, message: "Student not found in your school." };
    }

    const parsed = studentSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[updateStudent] Zod errors:", parsed.error.flatten());
      return {
        success: false,
        error: true,
        message: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(", "),
      };
    }

    const d = parsed.data;

    // Check if new class belongs to this school
    const classItem = await prisma.class.findFirst({
      where: { 
        id: d.classId,
        schoolId: schoolId 
      },
      include: { _count: { select: { students: true } } },
    });

    if (!classItem) {
      return { success: false, error: true, message: "Class not found in your school." };
    }

    // Check class capacity if class is being changed
    if (existingStudent.classId !== d.classId && classItem.capacity === classItem._count.students) {
      return { success: false, error: true, message: "Class is full. Cannot move student here." };
    }

    // Check if new grade belongs to this school
    const gradeItem = await prisma.grade.findFirst({
      where: { 
        id: d.gradeId,
        schoolId: schoolId 
      },
    });

    if (!gradeItem) {
      return { success: false, error: true, message: "Grade not found in your school." };
    }

    // Check if parent belongs to this school (if parentId provided)
    if (d.parentId) {
      const parent = await prisma.parent.findFirst({
        where: { 
          id: d.parentId,
          schoolId: schoolId 
        },
      });
      if (!parent) {
        return { success: false, error: true, message: "Parent not found in your school." };
      }
    }

    // Check username uniqueness (excluding current student)
    if (d.username !== existingStudent.username) {
      const usernameExists = await prisma.student.findFirst({
        where: { 
          username: d.username,
          schoolId: schoolId,
          NOT: { id: data.id }
        },
      });
      if (usernameExists) {
        return { success: false, error: true, message: "Username already taken." };
      }
    }

    // Check email uniqueness
    if (d.email && d.email !== existingStudent.email) {
      const emailExists = await prisma.student.findFirst({
        where: { 
          email: d.email,
          schoolId: schoolId,
          NOT: { id: data.id }
        },
      });
      if (emailExists) {
        return { success: false, error: true, message: "Email already in use." };
      }
    }

    // Check phone uniqueness
    if (d.phone && d.phone !== existingStudent.phone) {
      const phoneExists = await prisma.student.findFirst({
        where: { 
          phone: d.phone,
          schoolId: schoolId,
          NOT: { id: data.id }
        },
      });
      if (phoneExists) {
        return { success: false, error: true, message: "Phone number already in use." };
      }
    }

    await prisma.student.update({
      where: { id: data.id },
      data: {
        username:  d.username,
        ...(d.password && d.password.trim() !== "" && {
          password: await bcrypt.hash(d.password, 12),
        }),
        name:      d.name,
        surname:   d.surname,
        email:     d.email     || null,
        phone:     d.phone     || null,
        address:   d.address,
        img:       d.img       || null,
        bloodType: d.bloodType,
        sex:       d.sex,
        birthday:  new Date(d.birthday),
        gradeId:   d.gradeId,
        classId:   d.classId,
        parentId:  d.parentId  || null,
      },
    });

    // revalidatePath("/list/students");
    return { success: true, error: false, message: "Student updated successfully" };
  } catch (err: unknown) {
    console.error("[updateStudent]", err);
    if (isPrismaUniqueError(err)) {
      return { success: false, error: true, message: uniqueMessage(err) };
    }
    return { success: false, error: true, message: "Failed to update student." };
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteStudent = async (
  _state: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const id = formData.get("id") as string;
  if (!id) return { success: false, error: true, message: "Missing ID." };
  
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    if (!schoolId) {
      return { success: false, error: true, message: "No school associated with this account." };
    }

    // Verify student exists and belongs to this school
    const student = await prisma.student.findFirst({
      where: { 
        id: id,
        schoolId: schoolId 
      },
      include: {
        attendances: true,
        results: true,
        feePayments: true,
        classHistory: true,
      },
    });

    if (!student) {
      return { success: false, error: true, message: "Student not found in your school." };
    }

    // Check if student has related data
    if (student.attendances.length > 0 || student.results.length > 0 || 
        student.feePayments.length > 0 || student.classHistory.length > 0) {
      return { 
        success: false, 
        error: true, 
        message: `Cannot delete student. They have ${student.attendances.length} attendance records, ${student.results.length} results, ${student.feePayments.length} fee payments, and ${student.classHistory.length} class history records.` 
      };
    }

    await prisma.student.delete({ where: { id } });
    
    // revalidatePath("/list/students");
    return { success: true, error: false, message: "Student deleted successfully" };
  } catch (err) {
    console.error("[deleteStudent]", err);
    return { success: false, error: true, message: "Failed to delete student." };
  }
};

// ─── GET STUDENTS (School Wise) ──────────────────────────────────────────────
export const getStudentsByClass = async (classId: number) => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER"]);
    const { schoolId } = session;

    if (!schoolId) {
      return [];
    }

    // Verify class belongs to this school
    const classItem = await prisma.class.findFirst({
      where: { 
        id: classId,
        schoolId: schoolId 
      },
    });

    if (!classItem) {
      return [];
    }

    const students = await prisma.student.findMany({
      where: {
        classId: classId,
        schoolId: schoolId,
      },
      include: {
        class: true,
        grade: true,
        parent: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return students;
  } catch (err) {
    console.error("[getStudentsByClass]", err);
    return [];
  }
};

export const getStudentById = async (id: string) => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER", "STUDENT"]);
    const { schoolId, role, } = session;
    const { userId } = await getUserRoleAuth();

    if (!schoolId) {
      return null;
    }

    // If user is student, they can only view their own profile
    if (role === "STUDENT" && userId !== id) {
      return null;
    }

    const student = await prisma.student.findFirst({
      where: { 
        id: id,
        schoolId: schoolId 
      },
      include: {
        class: true,
        grade: true,
        parent: true,
        attendances: {
          orderBy: { date: "desc" },
          take: 10,
        },
        results: {
          include: {
            exam: true,
          },
          orderBy: { id: "desc" },
          take: 10,
        },
        feePayments: {
          include: {
            classFeeStructure: {
              include: {
                feeType: true,
              },
            },
          },
          orderBy: { paidAt: "desc" },
          take: 10,
        },
      },
    });
    return student;
  } catch (err) {
    console.error("[getStudentById]", err);
    return null;
  }
};

export const getAllStudents = async () => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER"]);
    const { schoolId } = session;

    if (!schoolId) {
      return [];
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId: schoolId,
      },
      include: {
        class: true,
        grade: true,
        parent: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return students;
  } catch (err) {
    console.error("[getAllStudents]", err);
    return [];
  }
};

// ─── GET STUDENTS WITH PAGINATION (School Wise) ──────────────────────────────
export const getStudentsPaginated = async (page: number = 1, pageSize: number = 10, search?: string) => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER"]);
    const { schoolId } = session;

    if (!schoolId) {
      return { students: [], total: 0 };
    }

    const where: any = { schoolId: schoolId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { surname: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: true,
          grade: true,
          parent: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.student.count({ where }),
    ]);

    return { students, total };
  } catch (err) {
    console.error("[getStudentsPaginated]", err);
    return { students: [], total: 0 };
  }
};

// ─── GET STUDENT STATISTICS (School Wise) ────────────────────────────────────
export const getStudentStatistics = async () => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    if (!schoolId) {
      return null;
    }

    const [totalStudents, studentsByClass, studentsByGrade, recentStudents] = await Promise.all([
      prisma.student.count({ where: { schoolId: schoolId } }),
      prisma.student.groupBy({
        by: ["classId"],
        where: { schoolId: schoolId },
        _count: true,
      }),
      prisma.student.groupBy({
        by: ["gradeId"],
        where: { schoolId: schoolId },
        _count: true,
      }),
      prisma.student.findMany({
        where: { schoolId: schoolId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { class: true },
      }),
    ]);

    return {
      totalStudents,
      studentsByClass,
      studentsByGrade,
      recentStudents,
    };
  } catch (err) {
    console.error("[getStudentStatistics]", err);
    return null;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPrismaUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    "code" in err && (err as { code: string }).code === "P2002";
}

function uniqueMessage(err: unknown): string {
  const target = (err as { meta?: { target?: string[] } }).meta?.target?.[0];
  if (target === "username") return "Username already taken.";
  if (target === "email")    return "Email already in use.";
  if (target === "phone")    return "Phone number already in use.";
  return "Duplicate entry detected.";
}