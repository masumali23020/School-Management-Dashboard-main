// Actions/StudentActions/studentActions.ts
"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import prisma from "@/lib/db";
import { studentSchema, type StudentSchema } from "@/lib/FormValidationSchema";
import { requireSession } from "@/lib/get-session";

type ActionState = { success: boolean; error: boolean; message?: string };

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createStudent = async (
  _state: ActionState,
  data: StudentSchema
): Promise<ActionState> => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

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

    // Check class capacity
    const classItem = await prisma.class.findUnique({
      where: { id: d.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true, message: "Class is full. Cannot add more students." };
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

    // Check class capacity if class is being changed
    if (d.classId) {
      const classItem = await prisma.class.findUnique({
        where: { id: d.classId },
        include: { _count: { select: { students: true } } },
      });

      // Get current student's class
      const currentStudent = await prisma.student.findUnique({
        where: { id: data.id },
        select: { classId: true },
      });

      // Only check capacity if changing to a different class
      if (classItem && currentStudent?.classId !== d.classId && 
          classItem.capacity === classItem._count.students) {
        return { success: false, error: true, message: "Class is full. Cannot move student here." };
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
    await prisma.student.delete({ where: { id } });
    return { success: true, error: false, message: "Student deleted successfully" };
  } catch (err) {
    console.error("[deleteStudent]", err);
    return { success: false, error: true, message: "Failed to delete student." };
  }
};

// ─── GET STUDENTS ────────────────────────────────────────────────────────────
export const getStudentsByClass = async (classId: number) => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER"]);
    const students = await prisma.student.findMany({
      where: {
        classId: classId,
        schoolId: session.schoolId,
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
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        grade: true,
        parent: true,
        attendances: true,
        results: {
          include: {
            exam: true,
            subject: true,
          },
        },
        feePayments: {
          include: {
            classFeeStructure: {
              include: {
                feeType: true,
              },
            },
          },
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
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
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