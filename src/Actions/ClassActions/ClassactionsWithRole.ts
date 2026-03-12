"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

type RollEntry = { studentId: string; rollNumber: number };

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
    if (rolls.length === 0) return { success: false, error: "No roll numbers to save." };

    // Check duplicate roll numbers in the submitted data
    const rollNums = rolls.map((r) => r.rollNumber);
    if (new Set(rollNums).size !== rollNums.length) {
      return { success: false, error: "Duplicate roll numbers detected." };
    }

    // Fetch gradeId ONCE before the loop — this was the bug
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { gradeId: true },
    });

    if (!classRecord) {
      return { success: false, error: "Class not found." };
    }

    const { gradeId } = classRecord;

    // Upsert each roll number
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
            // Use connect instead of raw IDs — this fixes the Prisma validation error
            student:  { connect: { id: r.studentId } },
            class:    { connect: { id: classId } },
            grade:    { connect: { id: gradeId } },
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
    if (studentIds.length === 0) return { success: false, error: "No students to promote." };

    const [fromClass, toClass] = await Promise.all([
      prisma.class.findUnique({ where: { id: fromClassId }, select: { gradeId: true } }),
      prisma.class.findUnique({ where: { id: toClassId },   select: { gradeId: true } }),
    ]);

    if (!fromClass) return { success: false, error: "Source class not found." };
    if (!toClass)   return { success: false, error: "Target class not found." };

    const y = new Date().getFullYear();
    const currentYear = `${y - 1}-${y}`;

    // Save history for the year they are LEAVING
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
            class:   { connect: { id: fromClassId } },
            grade:   { connect: { id: fromClass.gradeId } },
          },
        }).catch(() => null) // skip if record already exists
      )
    );

    // Move students to new class + grade
    await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: {
        classId: toClassId,
        gradeId: toClass.gradeId,
      },
    });

    // Create history records for the NEW year
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
            class:   { connect: { id: toClassId } },
            grade:   { connect: { id: toClass.gradeId } },
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