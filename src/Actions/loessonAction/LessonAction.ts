// Actions/loessonAction/LessonAction.ts

"use server";

import { LessonSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

type CreateState = { success: boolean; error: boolean; message?: string };

export const createLesson = async (
  CreateState: CreateState,
  data: LessonSchema
) => {
  try {
    // Get current user and school info
    const { schoolId, role, userId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "No school associated with this account" 
      };
    }

    if (role !== "admin") {
      return { 
        success: false, 
        error: true, 
        message: "Unauthorized: Only admin can create lessons" 
      };
    }

    // Validate required fields
    if (!data.name || !data.day || !data.startTime || !data.endTime || !data.classSubjectTeacherId) {
      return { 
        success: false, 
        error: true, 
        message: "All fields are required" 
      };
    }

    // Get classSubjectTeacher with school verification
    const assignment = await prisma.classSubjectTeacher.findFirst({
      where: { 
        id: data.classSubjectTeacherId,
        schoolId: schoolId
      },
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
        message: "Invalid class-subject-teacher assignment for this school" 
      };
    }

    // Verify class belongs to this school
    if (assignment.class.schoolId !== schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "Class does not belong to your school" 
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

    // Create lesson with all relations including subject
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
        schoolId: schoolId,
      },
    });

    // revalidatePath("/list/lessons");
    // revalidatePath("/list/classes");
    // revalidatePath("/list/subjects");
    
    return { success: true, error: false, message: "Lesson created successfully" };
  } catch (err) {
    console.error("Error creating lesson:", err);
    return { success: false, error: true, message: "Failed to create lesson: " + (err as Error).message };
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
    // Get current user and school info
    const { schoolId, role } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "No school associated with this account" 
      };
    }

    if (role !== "admin") {
      return { 
        success: false, 
        error: true, 
        message: "Unauthorized: Only admin can update lessons" 
      };
    }

    // Verify lesson exists and belongs to this school
    const existingLesson = await prisma.lesson.findFirst({
      where: {
        id: data.id,
        schoolId: schoolId // Direct schoolId check
      },
      include: {
        class: true
      }
    });

    if (!existingLesson) {
      return { 
        success: false, 
        error: true, 
        message: "Lesson not found or does not belong to your school" 
      };
    }

    // Validate required fields
    if (!data.name || !data.day || !data.startTime || !data.endTime || !data.classSubjectTeacherId) {
      return { 
        success: false, 
        error: true, 
        message: "All fields are required" 
      };
    }

    // Get classSubjectTeacher with school verification
    const assignment = await prisma.classSubjectTeacher.findFirst({
      where: { 
        id: data.classSubjectTeacherId,
        schoolId: schoolId
      },
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
        message: "Invalid class-subject-teacher assignment for this school" 
      };
    }

    // Verify class belongs to this school
    if (assignment.class.schoolId !== schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "Class does not belong to your school" 
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

    // Update lesson with relations
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

    // revalidatePath("/list/lessons");
    // revalidatePath("/list/classes");
    // revalidatePath("/list/subjects");
    
    return { success: true, error: false, message: "Lesson updated successfully" };
  } catch (err) {
    console.error("Error updating lesson:", err);
    return { success: false, error: true, message: "Failed to update lesson: " + (err as Error).message };
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
    // Get current user and school info
    const { schoolId, role } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "No school associated with this account" 
      };
    }

    if (role !== "admin") {
      return { 
        success: false, 
        error: true, 
        message: "Unauthorized: Only admin can delete lessons" 
      };
    }

    const lessonId = parseInt(id);

    // Check if lesson exists and belongs to this school
    const lesson = await prisma.lesson.findFirst({
      where: { 
        id: lessonId,
        schoolId: schoolId // Direct schoolId check
      },
      include: {
        assignments: true,
        attendances: true,
        class: true,
      },
    });

    if (!lesson) {
      return { 
        success: false, 
        error: true, 
        message: "Lesson not found or does not belong to your school" 
      };
    }

    // Check for dependent records (Note: 'exams' might not exist in your schema)
    if (lesson.assignments.length > 0 || lesson.attendances.length > 0) {
      return { 
        success: false, 
        error: true, 
        message: `Cannot delete lesson because it has ${lesson.assignments.length} assignment(s) and ${lesson.attendances.length} attendance(s)` 
      };
    }

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    // revalidatePath("/list/lessons");
    // revalidatePath("/list/classes");
    // revalidatePath("/list/subjects");
    
    return { success: true, error: false, message: "Lesson deleted successfully" };
  } catch (err) {
    console.error("Error deleting lesson:", err);
    return { success: false, error: true, message: "Failed to delete lesson: " + (err as Error).message };
  }
};

// Additional helper function to get lessons for a specific school
export const getLessonsBySchool = async () => {
  try {
    const { schoolId, role } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { success: false, error: true, message: "No school associated" };
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        schoolId: schoolId
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      orderBy: [
        { day: "asc" },
        { startTime: "asc" }
      ]
    });

    return { success: true, data: lessons };
  } catch (err) {
    console.error("Error fetching lessons:", err);
    return { success: false, error: true, message: "Failed to fetch lessons" };
  }
};

// Helper function to check schedule conflict
export const checkScheduleConflict = async (
  classId: number,
  day: string,
  startTime: Date,
  endTime: Date,
  excludeLessonId?: number
) => {
  try {
    const { schoolId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { success: false, error: true, message: "No school associated" };
    }

    // Verify class belongs to this school
    const classItem = await prisma.class.findFirst({
      where: { id: classId, schoolId: schoolId }
    });

    if (!classItem) {
      return { success: false, error: true, message: "Class not found" };
    }

    const whereCondition: any = {
      classId: classId,
      day: day.toUpperCase() as any,
      schoolId: schoolId,
      OR: [
        {
          AND: [
            { startTime: { lte: new Date(startTime) } },
            { endTime: { gt: new Date(startTime) } },
          ],
        },
        {
          AND: [
            { startTime: { lt: new Date(endTime) } },
            { endTime: { gte: new Date(endTime) } },
          ],
        },
      ],
    };

    if (excludeLessonId) {
      whereCondition.NOT = { id: excludeLessonId };
    }

    const conflictingLesson = await prisma.lesson.findFirst({
      where: whereCondition,
      include: {
        subject: { select: { name: true } },
        teacher: { select: { name: true, surname: true } }
      }
    });

    return { 
      success: true, 
      hasConflict: !!conflictingLesson,
      conflictingLesson: conflictingLesson
    };
  } catch (err) {
    console.error("Error checking schedule conflict:", err);
    return { success: false, error: true, message: "Failed to check schedule" };
  }
};