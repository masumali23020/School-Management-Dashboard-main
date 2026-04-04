"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

const PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllClasses() {
  return prisma.class.findMany({
    select: { id: true, name: true, grade: { select: { level: true } } },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });
}

export async function getExamList({
  page = 1,
  search = "",
  classId,
  role,
  currentUserId,
}: {
  page?: number;
  search?: string;
  classId?: number;
  role: string;
  currentUserId: string;
}) {
  const where: any = { lesson: {} };

  if (search) {
    where.lesson.subject = { name: { contains: search, mode: "insensitive" } };
  }
  if (classId) where.lesson.classId = classId;

  switch (role) {
    case "teacher":
      if (currentUserId) {
        where.lesson.teacherId = currentUserId;
      }
      break;
    case "student":
      if (currentUserId) {
        where.lesson.class = { students: { some: { id: currentUserId } } };
      }
      break;
    case "parent":
      if (currentUserId) {
        where.lesson.class = { students: { some: { parentId: currentUserId } } };
      }
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.exam.findMany({
      where,
      include: {
        lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: PER_PAGE,
      skip: PER_PAGE * (page - 1),
    }),
    prisma.exam.count({ where }),
  ]);

  return { data, count };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET SUBJECTS FOR A CLASS
// Works purely from ClassSubjectTeacher — NO lesson required
// ─────────────────────────────────────────────────────────────────────────────

export async function getSubjectsForClass(classId: number) {
  const data = await prisma.classSubjectTeacher.findMany({
    where: {
      classId,
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
      teacher: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  });

  // 🔥 Only TEACHER নিশ্চিত করা
  const filtered = data.filter((cst) => cst.teacher.role === "TEACHER");

  return filtered.map((cst) => ({
    cstId: cst.id,
    subjectId: cst.subject.id,
    subjectName: cst.subject.name,
    teacherId: cst.teacher.id,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE EXAMS BULK
// Auto-finds or auto-creates a lesson for each CST row, then creates the exam
// ─────────────────────────────────────────────────────────────────────────────

export async function createExamsBulk(payload: {
  title: string;
  startTime: string;
  endTime: string;
  classes: {
    classId: number;
    gradeLevel: number;
    subjects: {
      cstId: number;
      subjectId: number;
      subjectName: string;
      teacherId: string;
    }[];
  }[];
}): Promise<{ success: boolean; created?: number; message?: string }> {
  try {
    const totalSubjects = payload.classes.reduce(
      (acc, c) => acc + c.subjects.length,
      0
    );

    if (totalSubjects === 0) {
      return {
        success: false,
        message:
          "No subjects assigned to the selected classes. Please assign subjects via Class Subject Teacher first.",
      };
    }

    let created = 0;

    for (const cls of payload.classes) {
      const primary = cls.gradeLevel <= 5;

      for (const subj of cls.subjects) {
        // 1. Find existing lesson for this CST row
        let lesson = await prisma.lesson.findFirst({
          where: { classSubjectTeacherId: subj.cstId },
          select: { id: true },
        });

        // 2. If no lesson exists, auto-create a placeholder
        if (!lesson) {
          lesson = await prisma.lesson.create({
            data: {
              name: `${subj.subjectName}`,
              day: "MONDAY",
              startTime: new Date(payload.startTime),
              endTime: new Date(payload.endTime),
              subjectId: subj.subjectId,
              classId: cls.classId,
              teacherId: subj.teacherId,
              classSubjectTeacherId: subj.cstId,
            },
            select: { id: true },
          });
        }

        // 3. Create the exam linked to the lesson
        await prisma.exam.create({
          data: {
            title: payload.title,
            startTime: new Date(payload.startTime),
            endTime: new Date(payload.endTime),
            totalMarks: primary ? 100 : 90,
            mcqMarks: primary ? null : 30,
            writtenMarks: primary ? 100 : 60,
            practicalMarks: null,
            lessonId: lesson.id,
          },
        });

        created++;
      }
    }

    revalidatePath("/list/exams");
    return { success: true, created };
  } catch (err: any) {
    console.error("createExamsBulk error:", err);
    return { success: false, message: err?.message ?? "Unknown error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export async function updateExamAction(data: {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
}): Promise<{ success: boolean }> {
  try {
    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    });
    revalidatePath("/list/exams");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteExamAction(
  id: number
): Promise<{ success: boolean }> {
  try {
    await prisma.exam.delete({ where: { id } });
    revalidatePath("/list/exams");
    return { success: true };
  } catch {
    return { success: false };
  }
}