"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

const ITEMS_PER_PAGE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helper function to verify school access ───────────────────────────────────
async function verifySchoolAccess(schoolId: number, classId: number) {
  const classItem = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId },
  });
  if (!classItem) {
    throw new Error("Class not found in your school");
  }
  return classItem;
}

// ── Get all classes (School Wise) ────────────────────────────────────────────
export async function getAllClasses() {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    console.log("No schoolId found, returning empty classes");
    return [];
  }

  const classes = await prisma.class.findMany({
    where: { schoolId: schoolId },
    select: { id: true, name: true, grade: { select: { level: true } } },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });

  console.log(`Found ${classes.length} classes for school ${schoolId}`);
  return classes;
}

// ── Get subjects assigned to a class (School Wise) ────────────────────────────
// export async function getClassSubjectsWithExams(
//   classId: number,
//    academicYear?: string  // অপশনাল করুন
// ): Promise<SubjectWithExam[]> {
//   const { schoolId } = await getUserRoleAuth();

// //   console.log("=== DEBUG getClassSubjectsWithExams ===");
// //   console.log("classId:", classId);
// //   console.log("academicYear:", academicYear);
// //   console.log("schoolId:", schoolId);

//   if (!schoolId) {
//     // console.log("No schoolId found");
//     return [];
//   }

//   // Verify class belongs to this school
//   await verifySchoolAccess(schoolId, classId);


//   const allCST = await prisma.classSubjectTeacher.findMany({
//     where: { classId },
//   });
// //   console.log("All CST records for this class (without filters):", JSON.stringify(allCST, null, 2));

//   const cstRows = await prisma.classSubjectTeacher.findMany({
//     where: { 
//       classId, 
//       academicYear,
//       schoolId: schoolId,
//     },
//     include: {
//       subject: true,
//       lessons: {
//         include: {
//           exams: {
//             orderBy: { startTime: "desc" },
//           },
//         },
//       },
//     },
//     orderBy: { subject: { name: "asc" } },
//   });

// //   console.log("Filtered CST rows:", JSON.stringify(cstRows, null, 2));
// //   console.log("Number of CST rows found:", cstRows.length);

//   // যদি কিছু না পাওয়া যায়, তাহলে academicYear ছাড়া চেক করি
//   if (cstRows.length === 0) {
//     // console.log("No records found with academicYear:", academicYear);
//     const cstWithoutYear = await prisma.classSubjectTeacher.findMany({
//       where: { classId, schoolId: schoolId },
//       include: { subject: true },
//     });
//     console.log("CST records without year filter:", JSON.stringify(cstWithoutYear, null, 2));
    
//     if (cstWithoutYear.length > 0) {
//       const availableYears = Array.from(new Set(cstWithoutYear.map(c => c.academicYear)));
//     //   console.log("Available academic years in DB:", availableYears);
//     }
//   }

//   const gradeRow = await prisma.class.findUnique({
//     where: { id: classId },
//     select: { grade: { select: { level: true } } },
//   });
//   const gradeLevel = gradeRow?.grade.level ?? 1;
//   const primary = gradeLevel <= 5;

//   return cstRows.map((row) => {
//     const examLesson = row.lessons.find((l) => l.exams.length > 0);
//     const exam = examLesson?.exams[0] ?? null;

//     return {
//       subjectId: row.subjectId,
//       subjectName: row.subject.name,
//       examId: exam?.id ?? null,
//       examTitle: exam?.title ?? null,
//       mcqMarks: primary ? null : (exam?.mcqMarks ?? 30),
//       writtenMarks: primary ? (exam?.writtenMarks ?? 100) : (exam?.writtenMarks ?? 60),
//       practicalMarks: primary ? null : (exam?.practicalMarks ?? null),
//       totalMarks: exam?.totalMarks ?? (primary ? 100 : 90),
//     };
//   });
// }

// ── Get all students with their marks for ALL subjects in a class (School Wise) ──
export async function getStudentsWithAllSubjectMarks(
  classId: number,
  examIds: number[]
): Promise<StudentExamRow[]> {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return [];
  }

  // Verify class belongs to this school
  await verifySchoolAccess(schoolId, classId);

  // Verify all exams belong to this school
  const exams = await prisma.exam.findMany({
    where: {
      id: { in: examIds },
      lesson: {
        class: { schoolId: schoolId },
      },
    },
    select: { id: true },
  });

  if (exams.length !== examIds.length) {
    // console.warn("Some exams not found in this school");
  }

  const students = await prisma.student.findMany({
    where: { classId, schoolId: schoolId },
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

// ── Save / update one student's mark (School Wise) ────────────────────────────
export async function saveOneExamMark(data: {
  studentId: string;
  examId: number;
  mcqScore: number | null;
  writtenScore: number | null;
  practicalScore: number | null;
  totalScore: number;
  resultId: number | null;
}) {
  const { schoolId, role } = await getUserRoleAuth();

  if (!schoolId) {
    return { success: false, error: "No school associated with this account" };
  }

  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: "Unauthorized: Only admin and teachers can save marks" };
  }

  // Verify exam belongs to this school
  const exam = await prisma.exam.findFirst({
    where: {
      id: data.examId,
      lesson: {
        class: { schoolId: schoolId },
      },
    },
  });

  if (!exam) {
    return { success: false, error: "Exam not found in your school" };
  }

  // Verify student belongs to this school
  const student = await prisma.student.findFirst({
    where: { id: data.studentId, schoolId: schoolId },
  });

  if (!student) {
    return { success: false, error: "Student not found in your school" };
  }

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
    const existingResult = await prisma.result.findFirst({
      where: {
        id: data.resultId,
        student: { schoolId: schoolId },
      },
    });
    if (!existingResult) {
      return { success: false, error: "Result not found in your school" };
    }
    await prisma.result.update({ where: { id: data.resultId }, data: payload });
  } else {
    await prisma.result.create({ data: payload });
  }

//   revalidatePath("/list/results/exams");
  return { success: true };
}

// ── Bulk save ALL marks in one transaction (School Wise) ──────────────────────
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
  const { schoolId, role } = await getUserRoleAuth();

  if (!schoolId) {
    return { success: false, error: "No school associated with this account" };
  }

  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: "Unauthorized: Only admin and teachers can save marks" };
  }

  // Get all unique exam IDs
  const examIds = Array.from(new Set(entries.map(e => e.examId)));
  
  // Verify all exams belong to this school
  const exams = await prisma.exam.findMany({
    where: {
      id: { in: examIds },
      lesson: {
        class: { schoolId: schoolId },
      },
    },
    select: { id: true },
  });

  if (exams.length !== examIds.length) {
    return { success: false, error: "Some exams not found in your school" };
  }

  // Verify all students belong to this school
  const studentIds = Array.from(new Set(entries.map(e => e.studentId)));
  const students = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      schoolId: schoolId,
    },
    select: { id: true },
  });

  if (students.length !== studentIds.length) {
    return { success: false, error: "Some students not found in your school" };
  }

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

// ── Delete one result (School Wise) ───────────────────────────────────────────
export async function deleteOneExamMark(resultId: number) {
  const { schoolId, role } = await getUserRoleAuth();

  if (!schoolId) {
    return { success: false, error: "No school associated with this account" };
  }

  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: "Unauthorized: Only admin and teachers can delete marks" };
  }

  // Verify result belongs to this school
  const result = await prisma.result.findFirst({
    where: {
      id: resultId,
      student: { schoolId: schoolId },
    },
  });

  if (!result) {
    return { success: false, error: "Result not found in your school" };
  }

  await prisma.result.delete({ where: { id: resultId } });
  revalidatePath("/list/results/exams");
  return { success: true };
}
// Actions/ExamAction/resultExamAction.ts

// Get available academic years for a class
export async function getAvailableAcademicYears(classId: number): Promise<string[]> {
  const { schoolId } = await getUserRoleAuth();
  
  if (!schoolId) return [];
  
  const years = await prisma.classSubjectTeacher.findMany({
    where: { classId, schoolId: schoolId },
    distinct: ["academicYear"],
    select: { academicYear: true },
    orderBy: { academicYear: "desc" },
  });
  
  return years.map(y => y.academicYear);
}

// Get exams by class and session
export async function getExamsByClassAndSession(classId: number, session: string): Promise<{ id: number; title: string }[]> {
  const { schoolId } = await getUserRoleAuth();
  
  if (!schoolId) return [];
  
  const sessionNum = parseInt(session) || new Date().getFullYear();
  
  // Try to get exams from ExamPublish first (for officially published exams)
  let exams = await prisma.exam.findMany({
    where: {
      lesson: { classId, class: { schoolId: schoolId } },
      examPublish: { some: { session: session } }
    },
    distinct: ["title"],
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  
  // If no exams found via ExamPublish, fallback to exams with matching session number
  if (exams.length === 0) {
    exams = await prisma.exam.findMany({
      where: {
        lesson: { classId, class: { schoolId: schoolId } },
        session: sessionNum
      },
      distinct: ["title"],
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  }
  
  return exams;
}

// Update getClassSubjectsWithExams to accept examId parameter
export async function getClassSubjectsWithExams(
  classId: number,
  academicYear?: string,
  examId?: number
): Promise<SubjectWithExam[]> {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) return [];

  await verifySchoolAccess(schoolId, classId);

  let year = academicYear;
  if (!year) {
    const latestCST = await prisma.classSubjectTeacher.findFirst({
      where: { classId, schoolId: schoolId },
      orderBy: { academicYear: "desc" },
      select: { academicYear: true },
    });
    year = latestCST?.academicYear || new Date().getFullYear().toString();
  }

  // If examId is provided, only get that specific exam's subject
  const whereCondition: any = { classId, academicYear: year, schoolId: schoolId };
  
  const cstRows = await prisma.classSubjectTeacher.findMany({
    where: whereCondition,
    include: {
      subject: true,
      lessons: {
        include: {
          exams: examId ? { where: { id: examId } } : { orderBy: { startTime: "desc" } },
        },
      },
    },
    orderBy: { subject: { name: "asc" } },
  });

  // Filter to only include rows that have the specified exam if examId is provided
  const filteredRows = examId 
    ? cstRows.filter(row => row.lessons.some(lesson => lesson.exams.length > 0))
    : cstRows;

  const gradeRow = await prisma.class.findUnique({
    where: { id: classId },
    select: { grade: { select: { level: true } } },
  });
  const gradeLevel = gradeRow?.grade.level ?? 1;
  const primary = gradeLevel <= 5;

  return filteredRows.map((row) => {
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

// ── Get exams list for a class with pagination + month filter (School Wise) ────
export async function getExamsByClass(
  classId: number,
  page = 1,
  month?: number,
  year?: number
) {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return { exams: [], count: 0, totalPages: 0 };
  }

  // Verify class belongs to this school
  const classItem = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId },
  });

  if (!classItem) {
    return { exams: [], count: 0, totalPages: 0 };
  }

  const now = new Date();
  const filterYear = year ?? now.getFullYear();
  const filterMonth = month ?? now.getMonth() + 1;
  const startOfMonth = new Date(filterYear, filterMonth - 1, 1);
  const endOfMonth = new Date(filterYear, filterMonth, 0, 23, 59, 59);

  const lessonIds = (
    await prisma.lesson.findMany({ 
      where: { 
        classId,
        class: { schoolId: schoolId }
      }, 
      select: { id: true } 
    })
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

  const totalStudents = await prisma.student.count({ 
    where: { classId, schoolId: schoolId } 
  });

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

// ── Get school info for display ──────────────────────────────────────────────
export async function getSchoolInfo() {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return null;
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      schoolName: true,
      shortName: true,
    },
  });

  return school;
}