"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";


import { ExamSchema } from "../../lib/FormValidationSchema";

import { getUserRoleAuth } from "@/lib/logsessition";

type CreateState = { success: boolean; error: boolean };
const ITEMS_PER_PAGE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubjectWithExam = {
  subjectId: number;
  subjectName: string;
  examId: number | null;       // null = no exam created yet for this subject
  examTitle: string | null;
  mcqMarks: number | null;     // null = primary (no MCQ)
  writtenMarks: number;
  practicalMarks: number | null;
  totalMarks: number;
};

export type StudentExamRow = {
  studentId: string;
  name: string;
  img: string | null;
  marks: Record<
    number, // subjectId
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
  return prisma.class.findMany({
    select: { id: true, name: true, grade: { select: { level: true } } },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });
}

// ── Get subjects assigned to a class (via ClassSubjectTeacher) ────────────────
// Also finds the latest exam per subject for this class
export async function getClassSubjectsWithExams(
  classId: number,
  academicYear?: string
): Promise<SubjectWithExam[]> {

  // যদি না পাঠাও → latest year নিবে
  const year =
    academicYear ??
    (await prisma.classSubjectTeacher.findFirst({
      where: { classId },
      orderBy: { academicYear: "desc" },
      select: { academicYear: true },
    }))?.academicYear;

  if (!year) return [];

  const cstRows = await prisma.classSubjectTeacher.findMany({
    where: { classId, academicYear: year },
    include: {
      subject: true,
      lessons: {
        include: {
          exams: {
            orderBy: { startTime: "desc" },
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
      mcqMarks: primary ? null : (exam?.mcqMarks ?? 30),
      writtenMarks: primary ? (exam?.writtenMarks ?? 100) : (exam?.writtenMarks ?? 60),
      practicalMarks: primary ? null : (exam?.practicalMarks ?? null),
      totalMarks: exam?.totalMarks ?? (primary ? 100 : 90),
    };
  });
}
// ── Get all students with their marks for ALL subjects in a class ─────────────
export async function getStudentsWithAllSubjectMarks(
  classId: number,
  examIds: number[]   // one examId per subject
): Promise<StudentExamRow[]> {
  const students = await prisma.student.findMany({
    where: { classId },
    select: {
      id: true,
      name: true,
      surname: true,
      img: true,
      results: {
        where: { examId: { in: examIds } },
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

// ── Save / update one student's mark for one subject's exam ──────────────────
export async function saveOneExamMark(data: {
  studentId: string;
  examId: number;
  mcqScore: number | null;
  writtenScore: number | null;
  practicalScore: number | null;
  totalScore: number;
  resultId: number | null;
}) {
  const payload = {
    score: data.totalScore,
    mcqScore: data.mcqScore,
    writtenScore: data.writtenScore,
    practicalScore: data.practicalScore,
    totalScore: data.totalScore,
    examId: data.examId,
    studentId: data.studentId,
  };

  if (data.resultId) {
    await prisma.result.update({ where: { id: data.resultId }, data: payload });
  } else {
    await prisma.result.create({ data: payload });
  }

  revalidatePath("/list/results/exams");
  return { success: true };
}

// ── Bulk save ALL marks in one transaction ────────────────────────────────────
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
  const ops = entries.map((e) => {
    const data = {
      score: e.totalScore,
      mcqScore: e.mcqScore,
      writtenScore: e.writtenScore,
      practicalScore: e.practicalScore,
      totalScore: e.totalScore,
      examId: e.examId,
      studentId: e.studentId,
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
  await prisma.result.delete({ where: { id: resultId } });
  revalidatePath("/list/results/exams");
  return { success: true };
}

// ── Get exams list for a class with pagination + month filter ─────────────────
export async function getExamsByClass(
  classId: number,
  page = 1,
  month?: number,
  year?: number
) {
  const now = new Date();
  const filterYear = year ?? now.getFullYear();
  const filterMonth = month ?? now.getMonth() + 1;
  const startOfMonth = new Date(filterYear, filterMonth - 1, 1);
  const endOfMonth = new Date(filterYear, filterMonth, 0, 23, 59, 59);

  const lessonIds = (
    await prisma.lesson.findMany({ where: { classId }, select: { id: true } })
  ).map((l) => l.id);

  const where = {
    lessonId: { in: lessonIds },
    startTime: { gte: startOfMonth, lte: endOfMonth },
  };

  const [exams, count] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: {
        lesson: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
        results: { select: { id: true, studentId: true } },
      },
      orderBy: { startTime: "asc" },
      take: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
    }),
    prisma.exam.count({ where }),
  ]);

  const totalStudents = await prisma.student.count({ where: { classId } });

  return {
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime,
      subjectId: e.lesson.subject.id,
      subjectName: e.lesson.subject.name,
      mcqMarks: e.mcqMarks,
      writtenMarks: e.writtenMarks,
      practicalMarks: e.practicalMarks,
      totalMarks: e.totalMarks,
      totalStudents,
      markedCount: e.results.length,
      isComplete: e.results.length >= totalStudents && totalStudents > 0,
    })),
    count,
    totalPages: Math.ceil(count / ITEMS_PER_PAGE),
  };
}


export const createExam = async (
  CreateState: CreateState,
  data: ExamSchema
) => {
      // const {role, userId} = await getUserRole()
        const { role,userId } = await getUserRoleAuth();

  try {
    if(role === "teacher"){
    const teacherLesson = await prisma.lesson.findFirst({
      where: {
        teacherId: userId!,
      },
    });

    if (!teacherLesson) {
      return { success: false, error: true };
    }
}

 
    await prisma.exam.create({
      data:{
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId

      }
    });

    // revalidatePath("/list/Exames");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  CreateState: CreateState,
  data: ExamSchema
) => {
      const { role,userId } = await getUserRoleAuth();
  try {
    if(role === "teacher"){
    const teacherLesson = await prisma.lesson.findFirst({
      where: {
        teacherId: userId!,
      },
    });

    if (!teacherLesson) {
      return { success: false, error: true };
    }
}

 
    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data:{
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId

      }
    });

    // revalidatePath("/list/Exames");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
//   console.log("Deleting ID:", id);
  try {

    await prisma.exam.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/Exames");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};