"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

// ── Get all classes (for class selector) ─────────────────────────────────────
export async function getAllClasses() {
  return prisma.class.findMany({
    select: { id: true, name: true, grade: { select: { level: true } } },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });
}

// ── Get assignments for a class, optionally filtered by month ─────────────────
export async function getAssignmentsByClass(
  classId: number,
  month?: number, // 1-12
  year?: number
) {
  const now = new Date();
  const filterYear = year ?? now.getFullYear();
  const filterMonth = month ?? now.getMonth() + 1;

  const startOfMonth = new Date(filterYear, filterMonth - 1, 1);
  const endOfMonth = new Date(filterYear, filterMonth, 0, 23, 59, 59);

  const lessons = await prisma.lesson.findMany({
    where: { classId },
    select: { id: true },
  });
  const lessonIds = lessons.map((l) => l.id);

  const assignments = await prisma.assignment.findMany({
    where: {
      lessonId: { in: lessonIds },
      dueDate: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      lesson: {
        include: {
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true, surname: true } },
        },
      },
      results: { select: { id: true, studentId: true, score: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // Count total students in class
  const totalStudents = await prisma.student.count({ where: { classId } });

  return assignments.map((a) => ({
    id: a.id,
    title: a.title,
    startDate: a.startDate,
    dueDate: a.dueDate,
    subjectId: a.lesson.subject.id,
    subjectName: a.lesson.subject.name,
    teacherName: `${a.lesson.teacher.name} ${a.lesson.teacher.surname}`,
    lessonId: a.lessonId,
    totalStudents,
    markedCount: a.results.length,
    isComplete: a.results.length >= totalStudents && totalStudents > 0,
  }));
}

// ── Get students with their result for a specific assignment ──────────────────
export async function getStudentsWithAssignmentMark(
  classId: number,
  assignmentId: number
) {
  const students = await prisma.student.findMany({
    where: { classId },
    select: {
      id: true,
      name: true,
      surname: true,
      img: true,
      results: {
        where: { assignmentId },
        select: { id: true, score: true, totalScore: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return students.map((s) => ({
    studentId: s.id,
    name: `${s.name} ${s.surname}`,
    img: s.img,
    resultId: s.results[0]?.id ?? null,
    score: s.results[0]?.score ?? null,
  }));
}

// ── Save (create or update) a single student's assignment mark ────────────────
export async function saveAssignmentMark(data: {
  studentId: string;
  assignmentId: number;
  score: number;
  resultId?: number | null;
}) {
  if (data.score < 0 || data.score > 100) {
    throw new Error("Score must be between 0 and 100");
  }

  if (data.resultId) {
    await prisma.result.update({
      where: { id: data.resultId },
      data: { score: data.score, totalScore: data.score },
    });
  } else {
    await prisma.result.create({
      data: {
        score: data.score,
        totalScore: data.score,
        assignmentId: data.assignmentId,
        studentId: data.studentId,
      },
    });
  }

  revalidatePath("/list/results/assignments");
  return { success: true };
}

// ── Bulk save all marks at once ───────────────────────────────────────────────
export async function bulkSaveAssignmentMarks(
  entries: {
    studentId: string;
    assignmentId: number;
    score: number;
    resultId?: number | null;
  }[]
) {
  const ops = entries
    .filter((e) => e.score !== null && e.score !== undefined)
    .map((e) => {
      if (e.resultId) {
        return prisma.result.update({
          where: { id: e.resultId },
          data: { score: e.score, totalScore: e.score },
        });
      }
      return prisma.result.create({
        data: {
          score: e.score,
          totalScore: e.score,
          assignmentId: e.assignmentId,
          studentId: e.studentId,
        },
      });
    });

  await prisma.$transaction(ops);
  revalidatePath("/list/results/assignments");
  return { success: true };
}

// ── Delete a result (remove mark) ────────────────────────────────────────────
export async function deleteAssignmentMark(resultId: number) {
  await prisma.result.delete({ where: { id: resultId } });
  revalidatePath("/list/results/assignments");
  return { success: true };
}