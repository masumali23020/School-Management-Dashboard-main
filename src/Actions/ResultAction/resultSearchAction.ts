"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export type ExamPublishStatusItem = {
  examId: number;
  title: string;
  subjectName: string;
  className: string;
  classId: number;
  resultCount: number;
  totalStudents: number;
  isPublished: boolean;
  session: string | null;
};

// ─────────────────────────────────────────────────────────
// GET PUBLISH STATUS FOR ALL EXAMS IN A CLASS (School Wise)
// ─────────────────────────────────────────────────────────

export async function getExamPublishStatus(
  classId: number,
  session: string
): Promise<ExamPublishStatusItem[]> {
  const { schoolId, role } = await getUserRoleAuth();

  if (!schoolId) return [];
  if (role !== "admin") return [];

  // Verify class belongs to this school
  const classData = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId },
    include: { _count: { select: { students: true } } },
  });
  
  if (!classData) return [];
  
  const totalStudents = classData._count?.students ?? 0;

  const exams = await prisma.exam.findMany({
    where: { 
      lesson: { 
        classId,
        class: { schoolId: schoolId }
      } 
    },
    include: {
      examPublish: { where: { classId, session } },
      lesson: { 
        include: { 
          subject: { select: { name: true } }, 
          class: { select: { name: true } } 
        } 
      },
      results: {
        where: { student: { schoolId: schoolId } },
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
      session:       publish?.session     ?? null,
    };
  });
}

// ─────────────────────────────────────────────────────────
// ADMIN: CHECK IF ALL MARKS ENTERED (School Wise)
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
  const { schoolId, role } = await getUserRoleAuth();

  if (!schoolId) {
    return { canPublish: false, reason: "No school associated", totalStudents: 0, markedStudents: 0 };
  }

  if (role !== "admin") {
    return { canPublish: false, reason: "Unauthorized", totalStudents: 0, markedStudents: 0 };
  }

  // Verify exam belongs to this school
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      lesson: {
        class: { schoolId: schoolId }
      }
    }
  });

  if (!exam) {
    return { canPublish: false, reason: "Exam not found in your school", totalStudents: 0, markedStudents: 0 };
  }

  // Verify class belongs to this school
  const classData = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId },
    include: { _count: { select: { students: true } } },
  });
  
  if (!classData) {
    return { canPublish: false, reason: "Class not found", totalStudents: 0, markedStudents: 0 };
  }
  
  const totalStudents = classData._count?.students ?? 0;

  const markedData = await prisma.result.findMany({
    where: { 
      examId,
      student: { schoolId: schoolId }
    },
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
// ADMIN: PUBLISH EXAM RESULT (School Wise)
// ─────────────────────────────────────────────────────────

export async function publishExamResult(
  examId: number,
  classId: number,
  session: string
) {
  const { schoolId, role } = await getUserRoleAuth();

  console.log("=== publishExamResult DEBUG ===");
  console.log("examId:", examId);
  console.log("classId:", classId);
  console.log("session:", session);
  console.log("schoolId:", schoolId);
  console.log("role:", role);

  if (!schoolId) {
    return { success: false, error: "No school associated with this account" };
  }

  if (role !== "admin") {
    return { success: false, error: "Unauthorized: Only admin can publish exam results" };
  }

  // Verify exam belongs to this school
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      lesson: {
        class: { schoolId: schoolId }
      }
    }
  });

  if (!exam) {
    return { success: false, error: "Exam not found in your school" };
  }

  // Verify class belongs to this school
  const classItem = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId }
  });

  if (!classItem) {
    return { success: false, error: "Class not found in your school" };
  }

  const { canPublish, reason } = await canPublishExam(examId, classId);
  if (!canPublish) return { success: false, error: reason };

  try {
    // Check if publish record already exists
    const existing = await prisma.examPublish.findFirst({
      where: { 
        examId, 
        classId, 
        session
      },
    });

    if (existing) {
      // Update existing record
      await prisma.examPublish.update({
        where: { id: existing.id },
        data: { isPublished: true },
      });
      console.log("Updated existing record");
    } else {
      // Create new record
      await prisma.examPublish.create({
        data: { 
          examId, 
          classId, 
          session, 
          isPublished: true 
        },
      });
      console.log("Created new record");
    }

    revalidatePath("/admin/results/publish");
    revalidatePath("/result");
    return { success: true, message: "Exam results published successfully" };
  } catch (err: any) {
    console.error("[publishExamResult] ERROR DETAILS:", err);
    return { success: false, error: `Failed to publish: ${err.message || "Unknown error"}` };
  }
}

// ─────────────────────────────────────────────────────────
// ADMIN: UNPUBLISH EXAM RESULT (School Wise)
// ─────────────────────────────────────────────────────────

export async function unpublishExamResult(
  examId: number,
  classId: number,
  session: string
) {
  const { schoolId, role } = await getUserRoleAuth();

  if (!schoolId) {
    return { success: false, error: "No school associated with this account" };
  }

  if (role !== "admin") {
    return { success: false, error: "Unauthorized: Only admin can unpublish exam results" };
  }

  // Verify exam belongs to this school
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      lesson: {
        class: { schoolId: schoolId }
      }
    }
  });

  if (!exam) {
    return { success: false, error: "Exam not found in your school" };
  }

  // Verify class belongs to this school
  const classItem = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId }
  });

  if (!classItem) {
    return { success: false, error: "Class not found in your school" };
  }

  try {
    const existing = await prisma.examPublish.findFirst({
      where: { 
        examId, 
        classId, 
        session
      },
    });

    if (!existing) return { success: false, error: "Publish record not found." };

    await prisma.examPublish.update({
      where: { id: existing.id },
      data: { isPublished: false },
    });

    revalidatePath("/admin/results/publish");
    revalidatePath("/result");
    return { success: true, message: "Exam results unpublished successfully" };
  } catch (err: any) {
    console.error("[unpublishExamResult]", err);
    return { success: false, error: "Failed to unpublish. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────
// PUBLIC: GET PUBLISHED EXAMS FOR STUDENT (School Wise)
// ─────────────────────────────────────────────────────────

export async function getPublishedExamsForStudent(studentId: string) {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) {
    return { success: false, data: [] };
  }

  // Verify student belongs to this school
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: schoolId },
    select: { classId: true }
  });

  if (!student) {
    return { success: false, data: [] };
  }

  const publishedExams = await prisma.examPublish.findMany({
    where: {
      classId: student.classId,
      isPublished: true,
      exam: {
        lesson: {
          class: { schoolId: schoolId }
        }
      }
    },
    include: {
      exam: {
        include: {
          lesson: {
            include: {
              subject: { select: { name: true } },
              teacher: { select: { name: true, surname: true } }
            }
          },
          results: {
            where: { studentId: studentId },
            take: 1
          }
        }
      }
    },
    orderBy: { id: "desc" }
  });

  const formattedExams = publishedExams.map(pe => ({
    id: pe.exam.id,
    title: pe.exam.title,
    subjectName: pe.exam.lesson.subject.name,
    teacherName: `${pe.exam.lesson.teacher.name} ${pe.exam.lesson.teacher.surname}`,
    startTime: pe.exam.startTime,
    totalMarks: pe.exam.totalMarks,
    obtainedMarks: pe.exam.results[0]?.totalScore || pe.exam.results[0]?.score || null,
    session: pe.session
  }));

  return { success: true, data: formattedExams };
}

// ─────────────────────────────────────────────────────────
// PUBLIC: GET PUBLISHED SESSIONS BY CLASS (School Wise)
// ─────────────────────────────────────────────────────────

export async function getPublishedSessionsByClass(
  classId: number
): Promise<string[]> {
  const { schoolId } = await getUserRoleAuth();
  
  if (!schoolId) return [];
  
  // Verify class belongs to this school
  const classItem = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId }
  });
  
  if (!classItem) return [];

  const records = await prisma.examPublish.findMany({
    where: { 
      classId, 
      isPublished: true,
      exam: {
        lesson: {
          class: { schoolId: schoolId }
        }
      }
    },
    select: { session: true },
    distinct: ["session"],
    orderBy: { session: "desc" },
  });
  
  return records.map((r) => r.session);
}

// ─────────────────────────────────────────────────────────
// PUBLIC: GET PUBLISHED EXAMS BY CLASS AND SESSION (School Wise)
// ─────────────────────────────────────────────────────────

export async function getPublishedExamsByClassAndSession(
  classId: number,
  session: string
): Promise<string[]> {
  const { schoolId } = await getUserRoleAuth();
  
  if (!schoolId) return [];
  
  // Verify class belongs to this school
  const classItem = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId }
  });
  
  if (!classItem) return [];

  const published = await prisma.examPublish.findMany({
    where: { 
      classId, 
      session, 
      isPublished: true,
      exam: {
        lesson: {
          class: { schoolId: schoolId }
        }
      }
    },
    select: { examId: true },
  });

  const ids = published.map((e) => e.examId);
  if (ids.length === 0) return [];

  const exams = await prisma.exam.findMany({
    where: { 
      id: { in: ids },
      lesson: {
        class: { schoolId: schoolId }
      }
    },
    select: { title: true },
    distinct: ["title"],
    orderBy: { title: "asc" },
  });

  return exams.map((e) => e.title);
}

// ─────────────────────────────────────────────────────────
// CHECK IF EXAM IS PUBLISHED (School Wise)
// ─────────────────────────────────────────────────────────

export async function isExamPublished(
  examId: number, 
  classId: number, 
  session: string
): Promise<boolean> {
  const { schoolId } = await getUserRoleAuth();

  if (!schoolId) return false;

  const publishRecord = await prisma.examPublish.findFirst({
    where: {
      examId,
      classId,
      session,
      isPublished: true,
      exam: {
        lesson: {
          class: { schoolId: schoolId }
        }
      }
    }
  });

  return !!publishRecord;
}