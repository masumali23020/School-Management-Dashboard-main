"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bulkAssignmentMarkSchema } from "@/lib/validations/result.schema";
import {
  getTeacherByClerkId,
  getAssignmentByClassSubject,
  getExistingAssignmentResults,
  getStudentsByClass,
} from "@/lib/queries/result.queries";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── Get Assignment for class/subject ─────────────────────────────────────────
export async function getAssignmentAction(
  classId: number,
  subjectId: number
): Promise<ActionResult<{
  assignment: { id: number; title: string; dueDate: Date } | null;
  students: { id: string; name: string; surname: string }[];
  existingResults: { studentId: string; score: number }[];
}>> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const teacher = await getTeacherByClerkId(userId);
    if (!teacher) return { success: false, error: "Teacher record not found" };

    const assignment = await getAssignmentByClassSubject(classId, subjectId, teacher.id);
    const students = await getStudentsByClass(classId);

    if (!assignment) {
      return {
        success: true,
        data: { assignment: null, students, existingResults: [] },
      };
    }

    const existing = await getExistingAssignmentResults(
      assignment.id,
      students.map((s) => s.id)
    );

    return {
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.dueDate,
        },
        students,
        existingResults: existing.map((r) => ({
          studentId: r.studentId,
          score: r.score,
        })),
      },
    };
  } catch (err) {
    console.error("[getAssignmentAction]", err);
    return { success: false, error: "Failed to load assignment data" };
  }
}

// ─── Save Assignment Marks (Bulk Upsert) ─────────────────────────────────────
export async function saveAssignmentMarksAction(
  input: unknown
): Promise<ActionResult<{ saved: number; updated: number }>> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const teacher = await getTeacherByClerkId(userId);
    if (!teacher) return { success: false, error: "Teacher record not found" };

    const parsed = bulkAssignmentMarkSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { assignmentId, marks } = parsed.data;

    // Verify assignment exists and belongs to teacher's class
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: { lesson: true },
    });
    if (!assignment) return { success: false, error: "Assignment not found" };

    // Get existing results to decide create vs update
    const existingResults = await getExistingAssignmentResults(
      assignmentId,
      marks.map((m) => m.studentId)
    );
    const existingMap = new Map(existingResults.map((r) => [r.studentId, r]));

    let saved = 0;
    let updated = 0;

    await db.$transaction(async (tx) => {
      for (const mark of marks) {
        const existing = existingMap.get(mark.studentId);

        if (existing) {
          await tx.result.update({
            where: { id: existing.id },
            data: {
              score: mark.score,
              totalScore: mark.score,
            },
          });
          updated++;
        } else {
          await tx.result.create({
            data: {
              studentId: mark.studentId,
              assignmentId,
              score: mark.score,
              totalScore: mark.score,
            },
          });
          saved++;
        }
      }
    });

    revalidatePath("/result");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { saved, updated },
      message: `Saved ${saved} new, updated ${updated} existing marks`,
    };
  } catch (err) {
    console.error("[saveAssignmentMarksAction]", err);
    return { success: false, error: "Failed to save marks. Please try again." };
  }
}
