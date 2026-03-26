// Actions/loessonAction/LessonAction.ts

"use server";

import { LessonSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";
import { revalidatePath } from "next/cache";

type CreateState = { success: boolean; error: boolean; message?: string };

export const createLesson = async (
  CreateState: CreateState,
  data: LessonSchema
) => {
  try {
    // Validate required fields
    if (!data.name || !data.day || !data.startTime || !data.endTime || !data.classSubjectTeacherId) {
      return { 
        success: false, 
        error: true, 
        message: "All fields are required" 
      };
    }

    // Get classSubjectTeacher to verify and get related IDs
    const assignment = await prisma.classSubjectTeacher.findUnique({
      where: { id: data.classSubjectTeacherId },
      include: {
        class: true,
        subject: true,
        teacher: true,
      },
    });

    if (!assignment) {
      return { 
        success: false, 
        error: true, 
        message: "Invalid class-subject-teacher assignment" 
      };
    }

    // Check for schedule conflict in the same class
    const conflictingLesson = await prisma.lesson.findFirst({
      where: {
        classId: assignment.classId,
        day: data.day.toUpperCase() as any,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(data.startTime) } },
              { endTime: { gt: new Date(data.startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(data.endTime) } },
              { endTime: { gte: new Date(data.endTime) } },
            ],
          },
        ],
      },
    });

    if (conflictingLesson) {
      return { 
        success: false, 
        error: true, 
        message: "Schedule conflict: Another lesson already scheduled at this time in this class" 
      };
    }

    // Create lesson with all relations
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day.toUpperCase() as any,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        classSubjectTeacherId: data.classSubjectTeacherId,
      },
    });

    // revalidatePath("/lesson");
    // revalidatePath("/class");
    // revalidatePath("/subject");
    
    return { success: true, error: false, message: "Lesson created successfully" };
  } catch (err) {
    console.error("Error creating lesson:", err);
    return { success: false, error: true, message: "Failed to create lesson" };
  }
};

export const updateLesson = async (
  CreateState: CreateState,
  data: LessonSchema
) => {
  if (!data.id || data.id === 0) {
    return { success: false, error: true, message: "Invalid ID for update" };
  }

  try {
    // Validate required fields
    if (!data.name || !data.day || !data.startTime || !data.endTime || !data.classSubjectTeacherId) {
      return { 
        success: false, 
        error: true, 
        message: "All fields are required" 
      };
    }

    // Get classSubjectTeacher to verify and get related IDs
    const assignment = await prisma.classSubjectTeacher.findUnique({
      where: { id: data.classSubjectTeacherId },
      include: {
        class: true,
        subject: true,
        teacher: true,
      },
    });

    if (!assignment) {
      return { 
        success: false, 
        error: true, 
        message: "Invalid class-subject-teacher assignment" 
      };
    }

    // Check for schedule conflict excluding current lesson
    const conflictingLesson = await prisma.lesson.findFirst({
      where: {
        classId: assignment.classId,
        day: data.day.toUpperCase() as any,
        NOT: { id: data.id },
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(data.startTime) } },
              { endTime: { gt: new Date(data.startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(data.endTime) } },
              { endTime: { gte: new Date(data.endTime) } },
            ],
          },
        ],
      },
    });

    if (conflictingLesson) {
      return { 
        success: false, 
        error: true, 
        message: "Schedule conflict: Another lesson already scheduled at this time in this class" 
      };
    }

    // Update lesson
    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day.toUpperCase() as any,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        classSubjectTeacherId: data.classSubjectTeacherId,
      },
    });

    // revalidatePath("/lesson");
    // revalidatePath("/class");
    // revalidatePath("/subject");
    
    return { success: true, error: false, message: "Lesson updated successfully" };
  } catch (err) {
    // console.error("Error updating lesson:", err);
    return { success: false, error: true, message: "Failed to update lesson" };
  }
};

export const deleteLesson = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  
  if (!id) {
    return { success: false, error: true, message: "ID is required" };
  }

  try {
    const lessonId = parseInt(id);

    // Check if lesson has related data
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        exams: true,
        assignments: true,
        attendances: true,
      },
    });

    if (!lesson) {
      return { success: false, error: true, message: "Lesson not found" };
    }

    if (lesson.exams.length > 0 || lesson.assignments.length > 0 || lesson.attendances.length > 0) {
      return { 
        success: false, 
        error: true, 
        message: "Cannot delete lesson because it has related exams, assignments, or attendances" 
      };
    }

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    // revalidatePath("/lesson");
    // revalidatePath("/class");
    // revalidatePath("/subject");
    
    return { success: true, error: false, message: "Lesson deleted successfully" };
  } catch (err) {
    // console.error("Error deleting lesson:", err);
    return { success: false, error: true, message: "Failed to delete lesson" };
  }
};