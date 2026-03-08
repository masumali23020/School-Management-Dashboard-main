"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  getTeacherByClerkId,
  getStudentsByClass,
  getExamsByClass,
  getExistingExamResults,
  getGradeLevel,
  getAllSubjectsByClass,
} from "@/lib/queries/result.queries";

export type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

// ─── Load all class data for exam mode ───────────────────────────────────────
export async function getClassExamDataAction(classId: number): Promise<
  ActionResult<{
    gradeLevel: number;
    students: { id: string; name: string; surname: string }[];
    subjects: {
      id: number;
      name: string;
      examId: number | null;
      examTitle: string | null;
      mcqMarks: number | null;
      writtenMarks: number | null;
      totalMarks: number;
    }[];
    existingResults: {
      studentId: string;
      examId: number;
      score: number;
      mcqScore: number | null;
      writtenScore: number | null;
      totalScore: number;
    }[];
  }>
> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const teacher = await getTeacherByClerkId(userId);
    if (!teacher) return { success: false, error: "Teacher record not found" };

    const [gradeLevel, students, examLessons] = await Promise.all([
      getGradeLevel(classId),
      getStudentsByClass(classId),
      getExamsByClass(classId),
    ]);

    const subjects = examLessons.map((lesson) => {
      const exam = lesson.exams[0] ?? null;
      return {
        id: lesson.subjectId,
        name: lesson.subject.name,
        examId: exam?.id ?? null,
        examTitle: exam?.title ?? null,
        mcqMarks: exam?.mcqMarks ?? null,
        writtenMarks: exam?.writtenMarks ?? null,
        totalMarks: exam?.totalMarks ?? 100,
      };
    });

    const examIds = subjects.map((s) => s.examId).filter(Boolean) as number[];
    const existingResults =
      examIds.length > 0
        ? await getExistingExamResults(
            examIds,
            students.map((s) => s.id)
          )
        : [];

    return {
      success: true,
      data: {
        gradeLevel,
        students,
        subjects,
        existingResults: existingResults.map((r) => ({
          studentId: r.studentId,
          examId: r.examId!,
          score: r.score,
          mcqScore: r.mcqScore,
          writtenScore: r.writtenScore,
          totalScore: r.totalScore,
        })),
      },
    };
  } catch (err) {
    console.error("[getClassExamDataAction]", err);
    return { success: false, error: "Failed to load class data" };
  }
}

// ─── Save Exam Results (Bulk Upsert) ─────────────────────────────────────────
export type ExamMarkEntry = {
  studentId: string;
  examId: number;
  // Primary
  score?: number;
  // Secondary
  mcqScore?: number;
  writtenScore?: number;
  totalScore: number;
};

export async function saveExamResultsAction(
  classId: number,
  entries: ExamMarkEntry[]
): Promise<ActionResult<{ saved: number; updated: number }>> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const teacher = await getTeacherByClerkId(userId);
    if (!teacher) return { success: false, error: "Teacher record not found" };

    if (!entries || entries.length === 0) {
      return { success: false, error: "No entries provided" };
    }

    // Validate all entries
    for (const entry of entries) {
      if (!entry.studentId || !entry.examId)
        return { success: false, error: "Invalid entry data" };
      if (entry.totalScore < 0 || entry.totalScore > 1000)
        return { success: false, error: "Invalid score value" };
    }

    // Get existing results
    const examIds = [...new Set(entries.map((e) => e.examId))];
    const studentIds = [...new Set(entries.map((e) => e.studentId))];
    const existing = await getExistingExamResults(examIds, studentIds);

    const existingMap = new Map(
      existing.map((r) => [`${r.studentId}_${r.examId}`, r])
    );

    let saved = 0;
    let updated = 0;

    await db.$transaction(async (tx) => {
      for (const entry of entries) {
        const key = `${entry.studentId}_${entry.examId}`;
        const existingRecord = existingMap.get(key);

        const data = {
          score: entry.score ?? entry.totalScore,
          mcqScore: entry.mcqScore ?? null,
          writtenScore: entry.writtenScore ?? null,
          totalScore: entry.totalScore,
        };

        if (existingRecord) {
          await tx.result.update({
            where: { id: existingRecord.id },
            data,
          });
          updated++;
        } else {
          await tx.result.create({
            data: {
              ...data,
              studentId: entry.studentId,
              examId: entry.examId,
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
      message: `Saved ${saved} new, updated ${updated} existing results`,
    };
  } catch (err) {
    console.error("[saveExamResultsAction]", err);
    return { success: false, error: "Failed to save results. Please try again." };
  }
}
