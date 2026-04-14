"use server";

import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

export async function getAllClasses() {
  const { schoolId } = await getUserRoleAuth();
  return prisma.class.findMany({
    where: { schoolId: Number(schoolId) },
    select: { id: true, name: true, grade: { select: { level: true } } },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });
}

export async function getExamsByClass(
  classId: number,
  session: string,
  month?: number,
  year?: number
) {
  const { schoolId } = await getUserRoleAuth();
  const now = new Date();
  const filterYear = year ?? now.getFullYear();
  const filterMonth = month ?? now.getMonth() + 1;
  const startOfMonth = new Date(filterYear, filterMonth - 1, 1);
  const endOfMonth = new Date(filterYear, filterMonth, 0, 23, 59, 59);

  const lessons = await prisma.lesson.findMany({
    where: { classId, schoolId: Number(schoolId) },
    select: { id: true },
  });
  const lessonIds = lessons.map((l) => l.id);

  const exams = await prisma.exam.findMany({
    where: {
      schoolId: Number(schoolId),
      lessonId: { in: lessonIds },
      session: String(session) ,
      startTime: { gte: startOfMonth, lte: endOfMonth },
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
    orderBy: { startTime: "asc" },
  });

  const totalStudents = await prisma.student.count({
    where: { classId, schoolId: Number(schoolId) },
  });

  return exams.map((e) => {
    const lesson = e.lesson as any;
    return {
      id: e.id,
      title: e.title,
      session: String(e.session),
      startTime: e.startTime,
      endTime: e.endTime,
      totalMarks: e.totalMarks,
      subjectId: lesson.subject.id,
      subjectName: lesson.subject.name,
      teacherName: `${lesson.teacher.name} ${lesson.teacher.surname}`,
      lessonId: e.lessonId,
      totalStudents,
      markedCount: e.results.length,
      isComplete: e.results.length >= totalStudents && totalStudents > 0,
    };
  });
}

export async function getStudentsWithExamMark(classId: number, examId: number) {
  const { schoolId } = await getUserRoleAuth();
  const students = await prisma.student.findMany({
    where: { classId, schoolId: Number(schoolId) },
    select: {
      id: true,
      name: true,
      surname: true,
      img: true,
      results: {
        where: { examId },
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

export async function saveExamMark(data: {
  studentId: string;
  examId: number;
  score: number;
  totalMarks: number;
  resultId?: number | null;
}) {
  const { schoolId } = await getUserRoleAuth();
  if (data.score < 0 || data.score > data.totalMarks) {
    throw new Error(`Score must be between 0 and ${data.totalMarks}`);
  }

  if (data.resultId) {
    await prisma.result.update({
      where: { id: data.resultId },
      data: { score: data.score, totalScore: data.totalMarks },
    });
  } else {
    await prisma.result.create({
      data: {
        score: data.score,
        totalScore: data.totalMarks,
        examId: data.examId,
        studentId: data.studentId,
        schoolId: Number(schoolId),
      },
    });
  }

  revalidatePath("/list/results/exams");
  return { success: true };
}

export async function bulkSaveExamMarks(
  entries: {
    studentId: string;
    examId: number;
    score: number;
    totalMarks: number;
    resultId?: number | null;
  }[]
) {
  const { schoolId } = await getUserRoleAuth();
  const ops = entries
    .filter((e) => e.score !== null && e.score !== undefined)
    .map((e) => {
      if (e.resultId) {
        return prisma.result.update({
          where: { id: e.resultId },
          data: { score: e.score, totalScore: e.totalMarks },
        });
      }
      return prisma.result.create({
        data: {
          score: e.score,
          totalScore: e.totalMarks,
          examId: e.examId,
          studentId: e.studentId,
          schoolId: Number(schoolId),
        },
      });
    });

  await prisma.$transaction(ops);
  revalidatePath("/list/results/exams");
  return { success: true };
}

export async function deleteExamMark(resultId: number) {
  await prisma.result.delete({ where: { id: resultId } });
  revalidatePath("/list/results/exams");
  return { success: true };
}