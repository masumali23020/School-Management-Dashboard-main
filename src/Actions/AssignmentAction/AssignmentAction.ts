"use server";

import prisma from "../../lib/db";
import { AssignmentSchema } from "../../lib/FormValidationSchema";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

type CreateState = { 
  success: boolean; 
  error: boolean; 
  message?: string 
};

/**
 * 1. Create Assignment (Only one assignment per lesson)
 */
export const createAssignment = async (
  currentState: CreateState,
  data: AssignmentSchema
) => {
  try {
    const { userId, role, schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "School ID not found." };
    }

    // Validate required fields
    if (!data.title || !data.dueDate || !data.lessonId) {
      return { success: false, error: true, message: "Please fill all fields." };
    }

    // If user is teacher, check if they are assigning to their own lesson
    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId!,
          id: data.lessonId,
          schoolId: Number(schoolId),
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true, message: "You cannot assign to another teacher's lesson." };
      }
    }

    // CHECK IF ASSIGNMENT ALREADY EXISTS FOR THIS LESSON
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        lessonId: data.lessonId,
        schoolId: Number(schoolId),
      },
    });

    if (existingAssignment) {
      return { 
        success: false, 
        error: true, 
        message: "This lesson already has an assignment. Only one assignment is allowed per lesson." 
      };
    }

    // Create assignment
    await prisma.assignment.create({
      data: {
        title: data.title,
        dueDate: new Date(data.dueDate),
        lessonId: data.lessonId,
        schoolId: Number(schoolId),
      },
    });

    // revalidatePath("/list/assignments");
    return { success: true, error: false, message: "Assignment created successfully." };
  } catch (err) {
    console.error("Create Assignment Error:", err);
    return { success: false, error: true, message: "Failed to create assignment: " + (err as Error).message };
  }
};

/**
 * 2. Update Assignment
 */
export const updateAssignment = async (
  currentState: CreateState,
  data: AssignmentSchema
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Assignment ID not found." };
  }

  try {
    const { userId, role, schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "School ID not found." };
    }

    // Check if assignment exists and belongs to this school
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        id: data.id,
        schoolId: Number(schoolId),
      },
    });

    if (!existingAssignment) {
      return { success: false, error: true, message: "Assignment not found." };
    }

    // Check if trying to change lesson and new lesson already has assignment
    if (existingAssignment.lessonId !== data.lessonId) {
      const lessonHasAssignment = await prisma.assignment.findFirst({
        where: {
          lessonId: data.lessonId,
          schoolId: Number(schoolId),
          NOT: { id: data.id }
        },
      });

      if (lessonHasAssignment) {
        return { 
          success: false, 
          error: true, 
          message: "The target lesson already has an assignment. Only one assignment per lesson is allowed." 
        };
      }
    }

    await prisma.assignment.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        dueDate: new Date(data.dueDate),
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/assignments");
    return { success: true, error: false, message: "Assignment updated successfully." };
  } catch (err) {
    console.error("Update Assignment Error:", err);
    return { success: false, error: true, message: "Failed to update assignment: " + (err as Error).message };
  }
};

/**
 * 3. Delete Assignment
 */
export const deleteAssignment = async (
  currentState: CreateState,
  formData: FormData
) => {
  const id = formData.get("id") as string;
  
  if (!id) {
    return { success: false, error: true, message: "ID not found." };
  }

  try {
    const { userId, role, schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "School ID not found." };
    }

    // Check if assignment exists and belongs to this school
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: parseInt(id),
        schoolId: Number(schoolId),
      },
      include: {
        results: true,
      },
    });

    if (!assignment) {
      return { success: false, error: true, message: "Assignment not found." };
    }

    // Check if assignment has any results
    if (assignment.results && assignment.results.length > 0) {
      return { success: false, error: true, message: "Cannot delete assignment because it has results." };
    }

    await prisma.assignment.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/assignments");
    return { success: true, error: false, message: "Assignment deleted successfully." };
  } catch (err) {
    console.error("Delete Assignment Error:", err);
    return { success: false, error: true, message: "Failed to delete assignment: " + (err as Error).message };
  }
};