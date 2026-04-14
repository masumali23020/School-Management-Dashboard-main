"use server";

import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

export type SubjectWithExam = {
  subjectId: number;
  subjectName: string;
  examId: number | null;
  examTitle: string | null;
  mcqMarks: number | null;
  writtenMarks: number;
  practicalMarks: number | null;
  totalMarks: number;
};

export type StudentExamRow = {
  studentId: string;
  name: string;
  img: string | null;
  marks: Record<
    number,
    {
      resultId: number | null;
      mcqScore: number | null;
      writtenScore: number | null;
      practicalScore: number | null;
      totalScore: number | null;
    }
  >;
};

// ── Get all classes ───────────────────────────────────────────────────────────

export async function getAllClasses() {
  const { schoolId } = await getUserRoleAuth();
  return prisma.class.findMany({
    where: { schoolId: Number(schoolId) },           // ← schoolId filter
    select: { id: true, name: true, grade: { select: { level: true } } },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });
}

// ── Get subjects with exams for a class ──────────────────────────────────────

export async function getClassSubjectsWithExams(
  classId: number,
  session = "2026"                                   // ← string session
): Promise<SubjectWithExam[]> {
  const { schoolId } = await getUserRoleAuth();

  const cstRows = await prisma.classSubjectTeacher.findMany({
    where: {
      classId,
      schoolId: Number(schoolId),                    // ← schoolId filter
      academicYear: session,                         // ← session filter
    },
    include: {
      subject: true,
      lessons: {
        where: { schoolId: Number(schoolId) },       // ← schoolId filter
        include: {
          exams: {
            where: { schoolId: Number(schoolId) },   // ← schoolId filter
            orderBy: { startTime: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { subject: { name: "asc" } },
  });

  const gradeRow = await prisma.class.findUnique({
    where: { id: classId },
    select: { grade: { select: { level: true } } },
  });
  const gradeLevel = gradeRow?.grade.level ?? 1;
  const primary = gradeLevel <= 5;

  return cstRows.map((row) => {
    const examLesson = row.lessons.find((l) => l.exams.length > 0);
    const exam = examLesson?.exams[0] ?? null;

    return {
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      examId: exam?.id ?? null,
      examTitle: exam?.title ?? null,
      mcqMarks: primary ? null : (exam?.mcqScore ?? 30),
      writtenMarks: primary ? (exam?.writtenScore ?? 100) : (exam?.writtenScore ?? 60),
      practicalMarks: primary ? null : (exam?.practicalScore ?? null),
      totalMarks: exam?.totalMarks ?? (primary ? 100 : 90),
    };
  });
}

// ── Get students with all marks ───────────────────────────────────────────────

export async function getStudentsWithAllSubjectMarks(
  classId: number,
  examIds: number[]
): Promise<StudentExamRow[]> {
  const { schoolId } = await getUserRoleAuth();

  const students = await prisma.student.findMany({
    where: {
      classId,
      schoolId: Number(schoolId),                    // ← schoolId filter
    },
    select: {
      id: true,
      name: true,
      surname: true,
      img: true,
      results: {
        where: {
          examId: { in: examIds },
          schoolId: Number(schoolId),                // ← schoolId filter
        },
        select: {
          id: true,
          examId: true,
          mcqScore: true,
          writtenScore: true,
          practicalScore: true,
          totalScore: true,
          score: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return students.map((s) => {
    const marks: StudentExamRow["marks"] = {};
    for (const examId of examIds) {
      const result = s.results.find((r) => r.examId === examId);
      marks[examId] = {
        resultId: result?.id ?? null,
        mcqScore: result?.mcqScore ?? null,
        writtenScore: result?.writtenScore ?? null,
        practicalScore: result?.practicalScore ?? null,
        totalScore: result?.totalScore ?? null,
      };
    }
    return {
      studentId: s.id,
      name: `${s.name} ${s.surname}`,
      img: s.img,
      marks,
    };
  });
}

// ── Save one mark ─────────────────────────────────────────────────────────────

export async function saveOneExamMark(data: {
  studentId: string;
  examId: number;
  mcqScore: number | null;
  writtenScore: number | null;
  practicalScore: number | null;
  totalScore: number;
  resultId: number | null;
}) {
  const { schoolId } = await getUserRoleAuth();

  const payload = {
    score: data.totalScore,
    mcqScore: data.mcqScore,
    writtenScore: data.writtenScore,
    practicalScore: data.practicalScore,
    totalScore: data.totalScore,
    examId: data.examId,
    studentId: data.studentId,
    schoolId: Number(schoolId),                      // ← schoolId যোগ
  };

  if (data.resultId) {
    await prisma.result.update({ where: { id: data.resultId }, data: payload });
  } else {
    await prisma.result.create({ data: payload });
  }

  revalidatePath("/list/results/exams");
  return { success: true };
}

// ── Bulk save ─────────────────────────────────────────────────────────────────

export async function bulkSaveAllExamMarks(
  entries: {
    studentId: string;
    examId: number;
    mcqScore: number | null;
    writtenScore: number | null;
    practicalScore: number | null;
    totalScore: number;
    resultId: number | null;
  }[]
) {
  const { schoolId } = await getUserRoleAuth();

  const ops = entries.map((e) => {
    const data = {
      score: e.totalScore,
      mcqScore: e.mcqScore,
      writtenScore: e.writtenScore,
      practicalScore: e.practicalScore,
      totalScore: e.totalScore,
      examId: e.examId,
      studentId: e.studentId,
      schoolId: Number(schoolId),                    // ← schoolId যোগ
    };
    if (e.resultId) {
      return prisma.result.update({ where: { id: e.resultId }, data });
    }
    return prisma.result.create({ data });
  });

  await prisma.$transaction(ops);
  revalidatePath("/list/results/exams");
  return { success: true };
}

// ── Delete one result ─────────────────────────────────────────────────────────

export async function deleteOneExamMark(resultId: number) {
  const { schoolId } = await getUserRoleAuth();

  // schoolId verify করে তারপর delete — অন্য school এর result delete করতে পারবে না
  await prisma.result.delete({
    where: {
      id: resultId,
      schoolId: Number(schoolId),                    // ← security check
    },
  });

  revalidatePath("/list/results/exams");
  return { success: true };
}
// ── Get subjects for a class (session wise) ───────────────────────────────────
export async function getClassSubjects(
  classId: number,
  session = "2026"
): Promise<SubjectWithExam[]> {
  const { schoolId } = await getUserRoleAuth();

  const cstRows = await prisma.classSubjectTeacher.findMany({
    where: {
      classId,
      schoolId: Number(schoolId),
      academicYear: session,
    },
    include: {
      subject: true,
      lessons: {
        where: { schoolId: Number(schoolId) },
        include: {
          exams: {
            where: { schoolId: Number(schoolId) },
            orderBy: { startTime: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { subject: { name: "asc" } },
  });

  const gradeRow = await prisma.class.findUnique({
    where: { id: classId },
    select: { grade: { select: { level: true } } },
  });
  const gradeLevel = gradeRow?.grade.level ?? 1;
  const primary = gradeLevel <= 5;

  return cstRows.map((row) => {
    const examLesson = row.lessons.find((l) => l.exams.length > 0);
    const exam = examLesson?.exams[0] ?? null;
    return {
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      examId: exam?.id ?? null,
      examTitle: exam?.title ?? null,
      mcqMarks: primary ? null : (exam?.mcqScore ?? 30),
      writtenMarks: primary ? (exam?.writtenScore ?? 100) : (exam?.writtenScore ?? 60),
      practicalMarks: primary ? null : (exam?.practicalScore ?? null),
      totalMarks: exam?.totalMarks ?? (primary ? 100 : 90),
    };
  });
}

// ── Get students with marks for ONE subject's exam ────────────────────────────
export async function getStudentsWithOneSubjectMarks(
  classId: number,
  examId: number
): Promise<StudentExamRow[]> {
  const { schoolId } = await getUserRoleAuth();

  const students = await prisma.student.findMany({
    where: { classId, schoolId: Number(schoolId) },
    select: {
      id: true,
      name: true,
      surname: true,
      img: true,
      results: {
        where: { examId, schoolId: Number(schoolId) },
        select: {
          id: true,
          examId: true,
          mcqScore: true,
          writtenScore: true,
          practicalScore: true,
          totalScore: true,
          score: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return students.map((s) => {
    const result = s.results[0] ?? null;
    return {
      studentId: s.id,
      name: `${s.name} ${s.surname}`,
      img: s.img,
      marks: {
        [examId]: {
          resultId: result?.id ?? null,
          mcqScore: result?.mcqScore ?? null,
          writtenScore: result?.writtenScore ?? null,
          practicalScore: result?.practicalScore ?? null,
          totalScore: result?.totalScore ?? null,
        },
      },
    };
  });
}