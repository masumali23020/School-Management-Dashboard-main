"use server";

import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

// ── Get all classes (for class selector) ─────────────────────────────────────
export async function getAllClasses() {
  const {schoolId} = await getUserRoleAuth()
  return prisma.class.findMany({
    where: { schoolId: Number(schoolId) },
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
  const { schoolId } = await getUserRoleAuth()
  
  if (!schoolId) {
    throw new Error("School ID not found");
  }
  
  // First verify the class belongs to this school
  const classExists = await prisma.class.findFirst({
    where: { 
      id: classId,
      schoolId: Number(schoolId)
    }
  });
  
  if (!classExists) {
    throw new Error("Class not found or does not belong to your school");
  }
  
  const now = new Date();
  const filterYear = year ?? now.getFullYear();
  const filterMonth = month ?? now.getMonth() + 1;

  const startOfMonth = new Date(filterYear, filterMonth - 1, 1);
  const endOfMonth = new Date(filterYear, filterMonth, 0, 23, 59, 59);

  const lessons = await prisma.lesson.findMany({
    where: { 
      classId,
      schoolId: Number(schoolId) // Add school filter
    },
    select: { id: true },
  });
  
  const lessonIds = lessons.map((l) => l.id);

  const assignments = await prisma.assignment.findMany({
    where: {
      lessonId: { in: lessonIds },
      dueDate: { gte: startOfMonth, lte: endOfMonth },
      schoolId: Number(schoolId), // Add school filter
    },
    include: {
      lesson: {
        include: {
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true, surname: true } },
        },
      },
      results: { 
        where: {
          schoolId: Number(schoolId) // Add school filter to results
        },
        select: { id: true, studentId: true, score: true } 
      },
    },
    orderBy: { dueDate: "asc" },
  });

  // Count total students in class (school wise)
  const totalStudents = await prisma.student.count({ 
    where: { 
      classId,
      schoolId: Number(schoolId)
    } 
  });

  return assignments.map((a) => ({
    id: a.id,
    title: a.title,
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
  const { schoolId } = await getUserRoleAuth()
  
  if (!schoolId) {
    throw new Error("School ID not found");
  }
  
  // Verify assignment belongs to this school
  const assignmentExists = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      schoolId: Number(schoolId)
    }
  });
  
  if (!assignmentExists) {
    throw new Error("Assignment not found or does not belong to your school");
  }
  
  // Verify class belongs to this school
  const classExists = await prisma.class.findFirst({
    where: {
      id: classId,
      schoolId: Number(schoolId)
    }
  });
  
  if (!classExists) {
    throw new Error("Class not found or does not belong to your school");
  }
  
  const students = await prisma.student.findMany({
    where: { 
      classId,
      schoolId: Number(schoolId)
    },
    select: {
      id: true,
      name: true,
      surname: true,
      img: true,
      results: {
        where: { 
          assignmentId,
          schoolId: Number(schoolId)
        },
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
  const { schoolId, role, userId } = await getUserRoleAuth();
  
  if (!schoolId) {
    throw new Error("School ID not found");
  }
  
  if (data.score < 0 || data.score > 100) {
    throw new Error("Score must be between 0 and 100");
  }
  
  // Verify assignment belongs to this school
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: data.assignmentId,
      schoolId: Number(schoolId)
    },
    include: {
      lesson: {
        include: {
          teacher: true
        }
      }
    }
  });
  
  if (!assignment) {
    throw new Error("Assignment not found or does not belong to your school");
  }
  
  // If user is teacher, check if they are the teacher for this lesson
  if (role === "teacher") {
    if (assignment.lesson.teacherId !== userId) {
      throw new Error("You are not authorized to mark this assignment");
    }
  }
  
  // Verify student belongs to this school
  const student = await prisma.student.findFirst({
    where: {
      id: data.studentId,
      schoolId: Number(schoolId)
    }
  });
  
  if (!student) {
    throw new Error("Student not found or does not belong to your school");
  }

  if (data.resultId) {
    // Verify result exists and belongs to this school
    const existingResult = await prisma.result.findFirst({
      where: {
        id: data.resultId,
        schoolId: Number(schoolId)
      }
    });
    
    if (!existingResult) {
      throw new Error("Result not found or does not belong to your school");
    }
    
    await prisma.result.update({
      where: { id: data.resultId },
      data: { 
        score: data.score, 
        totalScore: data.score 
      },
    });
  } else {
    await prisma.result.create({
      data: {
        score: data.score,
        totalScore: data.score,
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        schoolId: Number(schoolId),
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
  const { schoolId } = await getUserRoleAuth(); // ← schoolId নাও

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
          schoolId: Number(schoolId), // ← যোগ করো
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