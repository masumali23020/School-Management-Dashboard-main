"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

type RollEntry = { studentId: string; rollNumber: number };

/**
 * রোল নম্বর অ্যাসাইন করা (Assign Roll Numbers) - স্কুল ভিত্তিক সিকিউরিটি সহ
 */
export async function assignRollNumbers({
  classId,
  academicYear,
  rolls,
}: {
  classId: number;
  academicYear: string;
  rolls: RollEntry[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. লগইন ইউজারের স্কুল আইডি চেক করুন
    const { schoolId, role } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    if (rolls.length === 0) {
      return { success: false, error: "No roll numbers to save." };
    }

    // 2. চেক করুন এই ক্লাসটি ইউজারের স্কুলের কিনা
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: Number(schoolId), // স্কুল ভিত্তিক সিকিউরিটি
      },
      select: { gradeId: true, schoolId: true },
    });

    if (!classRecord) {
      return { success: false, error: "Class not found or you don't have access." };
    }

    const { gradeId } = classRecord;

    // 3. চেক করুন সব ছাত্র এই স্কুলের কিনা
    const students = await prisma.student.findMany({
      where: {
        id: { in: rolls.map(r => r.studentId) },
        schoolId: Number(schoolId), // স্কুল ভিত্তিক সিকিউরিটি
      },
      select: { id: true },
    });

    if (students.length !== rolls.length) {
      return { success: false, error: "Some students don't belong to your school." };
    }

    // 4. Duplicate roll number check
    const rollNums = rolls.map((r) => r.rollNumber);
    if (new Set(rollNums).size !== rollNums.length) {
      return { success: false, error: "Duplicate roll numbers detected." };
    }

    // 5. Upsert each roll number
    await Promise.all(
      rolls.map((r) =>
        prisma.studentClassHistory.upsert({
          where: {
            studentId_academicYear: {
              studentId: r.studentId,
              academicYear,
            },
          },
          update: {
            rollNumber: r.rollNumber,
            classId,
          },
          create: {
            academicYear,
            rollNumber: r.rollNumber,
            student: { connect: { id: r.studentId } },
            class: { connect: { id: classId } },
            grade: { connect: { id: gradeId } },
          },
        })
      )
    );

    revalidatePath(`/list/classes/${classId}`);
    return { success: true };
  } catch (err: any) {
    console.error("assignRollNumbers error:", err);
    if (err?.code === "P2002") {
      return {
        success: false,
        error: "Roll number conflict — each roll number must be unique per class per year.",
      };
    }
    return { success: false, error: "Failed to save roll numbers." };
  }
}

/**
 * ছাত্র প্রমোশন করা (Promote Students) - স্কুল ভিত্তিক সিকিউরিটি সহ
 */
export async function promoteStudents({
  fromClassId,
  toClassId,
  academicYear,
  studentIds,
}: {
  fromClassId: number;
  toClassId: number;
  academicYear: string;
  studentIds: string[];
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 1. লগইন ইউজারের স্কুল আইডি চেক করুন
    const { schoolId, role } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    if (studentIds.length === 0) {
      return { success: false, error: "No students to promote." };
    }

    // 2. চেক করুন both classes ইউজারের স্কুলের কিনা
    const [fromClass, toClass] = await Promise.all([
      prisma.class.findFirst({
        where: {
          id: fromClassId,
          schoolId: Number(schoolId), // স্কুল ভিত্তিক সিকিউরিটি
        },
        select: { gradeId: true, schoolId: true },
      }),
      prisma.class.findFirst({
        where: {
          id: toClassId,
          schoolId: Number(schoolId), // স্কুল ভিত্তিক সিকিউরিটি
        },
        select: { gradeId: true, schoolId: true },
      }),
    ]);

    if (!fromClass) {
      return { success: false, error: "Source class not found or you don't have access." };
    }
    if (!toClass) {
      return { success: false, error: "Target class not found or you don't have access." };
    }

    // 3. চেক করুন সব ছাত্র এই স্কুলের কিনা
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: Number(schoolId), // স্কুল ভিত্তিক সিকিউরিটি
      },
      select: { id: true, classId: true },
    });

    if (students.length !== studentIds.length) {
      return { success: false, error: "Some students don't belong to your school." };
    }

    // 4. চেক করুন সব ছাত্র বর্তমানে fromClass এ আছে কিনা
    const studentsInClass = students.filter(s => s.classId === fromClassId);
    if (studentsInClass.length !== studentIds.length) {
      return { 
        success: false, 
        error: "Some students are not currently in the source class." 
      };
    }

    const y = new Date().getFullYear();
    const currentYear = `${y - 1}-${y}`;

    // 5. Save history for the year they are LEAVING
    await Promise.all(
      studentIds.map((studentId, idx) =>
        prisma.studentClassHistory.upsert({
          where: {
            studentId_academicYear: { studentId, academicYear: currentYear },
          },
          update: {},
          create: {
            academicYear: currentYear,
            rollNumber: idx + 1,
            student: { connect: { id: studentId } },
            class: { connect: { id: fromClassId } },
            grade: { connect: { id: fromClass.gradeId } },
          },
        }).catch(() => null) // skip if record already exists
      )
    );

    // 6. Move students to new class + grade
    await prisma.student.updateMany({
      where: {
        id: { in: studentIds },
        schoolId: Number(schoolId), // স্কুল ভিত্তিক সিকিউরিটি
      },
      data: {
        classId: toClassId,
        gradeId: toClass.gradeId,
      },
    });

    // 7. Create history records for the NEW year
    await Promise.all(
      studentIds.map((studentId, idx) =>
        prisma.studentClassHistory.upsert({
          where: {
            studentId_academicYear: { studentId, academicYear },
          },
          update: {
            classId: toClassId,
            gradeId: toClass.gradeId,
            rollNumber: idx + 1,
          },
          create: {
            academicYear,
            rollNumber: idx + 1,
            student: { connect: { id: studentId } },
            class: { connect: { id: toClassId } },
            grade: { connect: { id: toClass.gradeId } },
          },
        })
      )
    );

    revalidatePath(`/list/classes/${fromClassId}`);
    revalidatePath(`/list/classes/${toClassId}`);
    return { success: true, count: studentIds.length };
  } catch (err: any) {
    console.error("promoteStudents error:", err);
    return { success: false, error: "Failed to promote students." };
  }
}

/**
 * ক্লাসের সব ছাত্রের রোল নম্বর দেখা (Get Roll Numbers) - স্কুল ভিত্তিক সিকিউরিটি সহ
 */
export async function getRollNumbers({
  classId,
  academicYear,
}: {
  classId: number;
  academicYear: string;
}): Promise<{ success: boolean; data?: RollEntry[]; error?: string }> {
  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    // চেক করুন ক্লাসটি ইউজারের স্কুলের কিনা
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: Number(schoolId),
      },
    });

    if (!classRecord) {
      return { success: false, error: "Class not found or you don't have access." };
    }

    const rollNumbers = await prisma.studentClassHistory.findMany({
      where: {
        classId,
        academicYear,
      },
      select: {
        studentId: true,
        rollNumber: true,
      },
      orderBy: {
        rollNumber: 'asc',
      },
    });

    return { 
      success: true, 
      data: rollNumbers.map(r => ({ 
        studentId: r.studentId, 
        rollNumber: r.rollNumber 
      }))
    };
  } catch (err: any) {
    console.error("getRollNumbers error:", err);
    return { success: false, error: "Failed to fetch roll numbers." };
  }
}

/**
 * ক্লাসের সব ছাত্রের তালিকা (Get Class Students) - স্কুল ভিত্তিক সিকিউরিটি সহ
 */
export async function getClassStudents({
  classId,
}: {
  classId: number;
}): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    // চেক করুন ক্লাসটি ইউজারের স্কুলের কিনা
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: Number(schoolId),
      },
    });

    if (!classRecord) {
      return { success: false, error: "Class not found or you don't have access." };
    }

    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId: Number(schoolId),
      },
      select: {
        id: true,
        name: true,
        surname: true,
        username: true,
        email: true,
        phone: true,
        sex: true,
        img: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { success: true, data: students };
  } catch (err: any) {
    console.error("getClassStudents error:", err);
    return { success: false, error: "Failed to fetch students." };
  }
}

/**
 * একাডেমিক ইয়ার পরিবর্তন (Change Academic Year) - স্কুল ভিত্তিক সিকিউরিটি সহ
 */
export async function changeAcademicYear({
  newAcademicYear,
}: {
  newAcademicYear: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    await prisma.school.update({
      where: {
        id: Number(schoolId),
      },
      data: {
        academicSession: newAcademicYear,
      },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("changeAcademicYear error:", err);
    return { success: false, error: "Failed to change academic year." };
  }
}