"use server";

import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export type StudentResultData = {
  student: {
    id: string;
    name: string;
    surname: string;
    roll: number | null;
    img: string | null;
    bloodType: string;
    birthday: Date;
    class: { name: string; grade: { level: number } };
    parent: { name: string; phone: string } | null;
  };
  exam: {
    id: number;
    title: string;
    session: string;
  };
  results: {
    id: number;
    subjectName: string;
    mcqScore: number | null;
    writtenScore: number | null;
    practicalScore: number | null;
    totalScore: number;
    score: number;
    gradeLevel: number;
  }[];
  isPublished: boolean;
  totalObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  gpa: number;
  position: number | null;
};

export type ExamPublishStatusItem = {
  examId: number;
  title: string;
  subjectName: string;
  className: string;
  classId: number;
  resultCount: number;
  totalStudents: number;
  isPublished: boolean;
  publishedAt: Date | null;
  session: string | null;
};

// ─────────────────────────────────────────────────────────
// GRADE HELPER
// ─────────────────────────────────────────────────────────

function calculateGrade(percentage: number): { grade: string; gpa: number } {
  if (percentage >= 80) return { grade: "A+", gpa: 5.0 };
  if (percentage >= 70) return { grade: "A",  gpa: 4.0 };
  if (percentage >= 60) return { grade: "A-", gpa: 3.5 };
  if (percentage >= 50) return { grade: "B",  gpa: 3.0 };
  if (percentage >= 40) return { grade: "C",  gpa: 2.0 };
  if (percentage >= 33) return { grade: "D",  gpa: 1.0 };
  return { grade: "F", gpa: 0.0 };
}

// ─────────────────────────────────────────────────────────
// SHARED QUERIES — DROPDOWNS
// ─────────────────────────────────────────────────────────

export async function getAllClasses() {
  return prisma.class.findMany({
    include: {
      grade: true,
      _count: { select: { students: true } },
    },
    orderBy: { grade: { level: "asc" } },
  });
}

export async function getExamsByClass(classId: number) {
  return prisma.exam.findMany({
    where: { lesson: { classId } },
    include: { examPublish: true },
    distinct: ["title"],
    orderBy: { startTime: "desc" },
  });
}

/**
 * Sessions (academicYear) that have at least one PUBLISHED exam for this class.
 * Used in the public result search page — session dropdown.
 */
export async function getPublishedSessionsByClass(
  classId: number
): Promise<string[]> {
  const records = await prisma.examPublish.findMany({
    where: { classId, isPublished: true },
    select: { session: true },
    distinct: ["session"],
    orderBy: { session: "desc" },
  });
  return records.map((r) => r.session);
}

/**
 * Distinct published exam titles for a class + session.
 * Used in the public result search page — exam dropdown.
 */
export async function getPublishedExamsByClassAndSession(
  classId: number,
  session: string
): Promise<string[]> {
  const published = await prisma.examPublish.findMany({
    where: { classId, session, isPublished: true },
    select: { examId: true },
  });

  const ids = published.map((e) => e.examId);
  if (ids.length === 0) return [];

  const exams = await prisma.exam.findMany({
    where: { id: { in: ids } },
    select: { title: true },
    distinct: ["title"],
    orderBy: { title: "asc" },
  });

  return exams.map((e) => e.title);
}

// ─────────────────────────────────────────────────────────
// PUBLIC: SEARCH STUDENT RESULT
// ─────────────────────────────────────────────────────────

type StudentWithRelations = {
  id: string;
  name: string;
  surname: string;
  img: string | null;
  bloodType: string;
  birthday: Date;
  class: { name: string; grade: { level: number } };
  parent: { name: string; phone: string } | null;
};

export async function searchStudentResult({
  classId,
  roll,
  session,
  examTitle,
}: {
  classId: number;
  roll: string;
  session: string;
  examTitle: string;
}): Promise<{ success: boolean; data?: StudentResultData; error?: string }> {
  try {
    const rollNumber = parseInt(roll, 10);
    if (isNaN(rollNumber)) {
      return { success: false, error: "Invalid roll number." };
    }

    let student: StudentWithRelations | null = null;
    let finalRoll: number = rollNumber;

    // ── Strategy 1: StudentClassHistory (roll + class + session) ──────────
    // This is the proper way if ClassHistory records exist
    const history = await prisma.studentClassHistory.findFirst({
      where: { classId, academicYear: session, rollNumber },
      include: {
        student: {
          include: {
            class: { include: { grade: true } },
            parent: true,
          },
        },
      },
    });

    if (history) {
      student   = history.student;
      finalRoll = history.rollNumber;
    }

    // ── Strategy 2: Fallback — Student table, sorted by name, roll = position ──
    // e.g. roll=1 → first student alphabetically in this class
    if (!student) {
      const allInClass = await prisma.student.findMany({
        where: { classId },
        include: {
          class: { include: { grade: true } },
          parent: true,
        },
        orderBy: [{ name: "asc" }, { surname: "asc" }],
      });

      if (rollNumber >= 1 && rollNumber <= allInClass.length) {
        student   = allInClass[rollNumber - 1];
        finalRoll = rollNumber;
      }
    }

    // ── Strategy 3: Fallback — match username exactly ─────────────────────
    if (!student) {
      const byUsername = await prisma.student.findFirst({
        where: { classId, username: roll },
        include: {
          class: { include: { grade: true } },
          parent: true,
        },
      });
      if (byUsername) {
        student   = byUsername;
        finalRoll = rollNumber;
      }
    }

    // ── No student found ──────────────────────────────────────────────────
    if (!student) {
      const count = await prisma.student.count({ where: { classId } });
      console.error("[searchStudentResult] Not found:", { classId, rollNumber, session });
      return {
        success: false,
        error:
          count === 0
            ? "No students found in this class."
            : `Student roll ${rollNumber} not found. This class has ${count} student${count !== 1 ? "s" : ""} (roll 1–${count}).`,
      };
    }

    // ── Step 2: Find exam ─────────────────────────────────────────────────
    const examCheck = await prisma.exam.findFirst({
      where: {
        title: { contains: examTitle, mode: "insensitive" },
        lesson: { classId },
      },
      include: { examPublish: true },
    });

    if (!examCheck) {
      return { success: false, error: "Exam not found for this class." };
    }

    // ── Step 3: Check publish status ──────────────────────────────────────
    const publishRecord = examCheck.examPublish.find(
      (ep) => ep.session === session && ep.classId === classId
    );

    if (!publishRecord?.isPublished) {
      return {
        success: false,
        error: "Result has not been published yet. Please check back later.",
      };
    }

    // ── Step 4: Get all subject results ───────────────────────────────────
    const allExamsForClass = await prisma.exam.findMany({
      where: {
        title: { contains: examTitle, mode: "insensitive" },
        lesson: { classId },
      },
      include: {
        lesson: { include: { subject: true } },
        results: { where: { studentId: student.id } },
      },
      orderBy: { lesson: { subject: { name: "asc" } } },
    });

    const gradeLevel = student.class.grade.level;

    const results = allExamsForClass.map((e) => {
      const r = e.results[0];
      return {
        id:             r?.id ?? 0,
        subjectName:    e.lesson.subject.name,
        mcqScore:       r?.mcqScore       ?? null,
        writtenScore:   r?.writtenScore   ?? null,
        practicalScore: r?.practicalScore ?? null,
        totalScore:     r?.totalScore     ?? 0,
        score:          r?.score          ?? 0,
        gradeLevel,
      };
    });

    const totalObtained  = results.reduce((sum, r) => sum + r.totalScore, 0);
    const totalMarks     = results.length * 100;
    const percentage     = totalMarks > 0 ? (totalObtained / totalMarks) * 100 : 0;
    const { grade, gpa } = calculateGrade(percentage);

    return {
      success: true,
      data: {
        student: {
          id:        student.id,
          name:      student.name,
          surname:   student.surname,
          roll:      finalRoll,
          img:       student.img,
          bloodType: student.bloodType,
          birthday:  student.birthday,
          class:     student.class,
          parent:    student.parent
            ? { name: student.parent.name, phone: student.parent.phone }
            : null,
        },
        exam: { id: examCheck.id, title: examCheck.title, session },
        results,
        isPublished:   true,
        totalObtained,
        totalMarks,
        percentage:    Math.round(percentage * 100) / 100,
        grade,
        gpa,
        position: null,
      },
    };
  } catch (err) {
    console.error("[searchStudentResult]", err);
    return { success: false, error: "Server error. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────
// ADMIN: GET PUBLISH STATUS FOR ALL EXAMS IN A CLASS
// ─────────────────────────────────────────────────────────

export async function getExamPublishStatus(
  classId: number,
  session: string
): Promise<ExamPublishStatusItem[]> {

  // Real student count from Class relation
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { students: true } } },
  });
  const totalStudents = classData?._count?.students ?? 0;

  const exams = await prisma.exam.findMany({
    where: { lesson: { classId } },
    include: {
      examPublish: { where: { classId, session } },
      lesson: { include: { subject: true, class: true } },
      results: {
        select: { studentId: true },
        distinct: ["studentId"],
      },
    },
    distinct: ["title"],
    orderBy: { startTime: "desc" },
  });

  return exams.map((e) => {
    const publish = e.examPublish[0] ?? null;
    return {
      examId:        e.id,
      title:         e.title,
      subjectName:   e.lesson.subject.name,
      className:     e.lesson.class.name,
      classId:       e.lesson.classId,
      resultCount:   e.results.length,
      totalStudents,
      isPublished:   publish?.isPublished ?? false,
      publishedAt:   publish?.publishedAt ?? null,
      session:       publish?.session     ?? null,
    };
  });
}

// ─────────────────────────────────────────────────────────
// ADMIN: CHECK IF ALL MARKS ENTERED
// ─────────────────────────────────────────────────────────

export async function canPublishExam(
  examId: number,
  classId: number
): Promise<{
  canPublish: boolean;
  reason?: string;
  totalStudents: number;
  markedStudents: number;
}> {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { students: true } } },
  });
  const totalStudents = classData?._count?.students ?? 0;

  const markedData = await prisma.result.findMany({
    where: { examId },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const markedStudents = markedData.length;

  if (markedStudents < totalStudents) {
    return {
      canPublish:     false,
      reason:         `${totalStudents - markedStudents} student(s) still have no marks entered. (${markedStudents}/${totalStudents})`,
      totalStudents,
      markedStudents,
    };
  }

  return { canPublish: true, totalStudents, markedStudents };
}

// ─────────────────────────────────────────────────────────
// ADMIN: PUBLISH
// ─────────────────────────────────────────────────────────

export async function publishExamResult(
  examId: number,
  classId: number,
  session: string
) {
  // Get the admin ID from auth on the server
  const auth = await getUserRoleAuth();
  if (!auth.userId) {
    return { success: false, error: "Unauthorized. Please log in." };
  }
  
  const adminId = auth.userId;

  const { canPublish, reason } = await canPublishExam(examId, classId);
  if (!canPublish) return { success: false, error: reason };

  try {
    const existing = await prisma.examPublish.findFirst({
      where: { examId, classId, session },
    });

    const {schoolId} = await getUserRoleAuth()

    if (existing) {
      await prisma.examPublish.update({
        where: { id: existing.id },
        data: { isPublished: true, publishedAt: new Date(), },
      });
    } else {
      await prisma.examPublish.create({
        data: { examId, classId, session, isPublished: true, publishedAt: new Date(),schoolId:Number(schoolId) },
      });
    }

    revalidatePath("/admin/results/publish");
    revalidatePath("/result");
    return { success: true };
  } catch (err) {
    console.error("[publishExamResult]", err);
    return { success: false, error: "Failed to publish. Please try again." };
  }
}
// ─────────────────────────────────────────────────────────
// ADMIN: UNPUBLISH
// ─────────────────────────────────────────────────────────

export async function unpublishExamResult(
  examId: number,
  classId: number,
  session: string
) {
  try {
    const existing = await prisma.examPublish.findFirst({
      where: { examId, classId, session },
    });

    if (!existing) return { success: false, error: "Publish record not found." };

    await prisma.examPublish.update({
      where: { id: existing.id },
      data: { isPublished: false, publishedAt: null },
    });

    revalidatePath("/admin/results/publish");
    revalidatePath("/result");
    return { success: true };
  } catch (err) {
    console.error("[unpublishExamResult]", err);
    return { success: false, error: "Failed to unpublish. Please try again." };
  }
}