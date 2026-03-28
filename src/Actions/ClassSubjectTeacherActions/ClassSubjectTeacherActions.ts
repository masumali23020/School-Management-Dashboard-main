// Actions/ClassSubjectTeacherActions/index.ts

"use server";

import { ClassSubjectTeacherSchema } from "@/lib/FormValidationSchema";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

type CreateState = { success: boolean; error: boolean; message?: string };

export const createClassSubjectTeacher = async (
  CreateState: CreateState,
  data: ClassSubjectTeacherSchema
) => {
  try {
    // Check if assignment already exists
    const existing = await prisma.classSubjectTeacher.findUnique({
      where: {
        classId_subjectId_academicYear: {
          classId: data.classId,
          subjectId: data.subjectId,
          academicYear: data.academicYear,
        },
      },
    });

    if (existing) {
      return { 
        success: false, 
        error: true, 
        message: "This subject is already assigned to this class for this academic year" 
      };
    }

    // Verify that class, subject, and teacher exist
    const [classExists, subjectExists, teacherExists] = await Promise.all([
      prisma.class.findUnique({ where: { id: data.classId } }),
      prisma.subject.findUnique({ where: { id: data.subjectId } }),
      prisma.employee.findUnique({ where: { id: data.teacherId } }),
    ]);

    if (!classExists) {
      return { 
        success: false, 
        error: true, 
        message: "Selected class does not exist" 
      };
    }

    if (!subjectExists) {
      return { 
        success: false, 
        error: true, 
        message: "Selected subject does not exist" 
      };
    }

    if (!teacherExists) {
      return { 
        success: false, 
        error: true, 
        message: "Selected teacher does not exist" 
      };
    }

    await prisma.classSubjectTeacher.create({
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        academicYear: data.academicYear,
      },
    });

    // revalidatePath("/class");
    // revalidatePath("/subject");
    // revalidatePath("/teacher");
    
    return { success: true, error: false, message: "Assignment created successfully" };
  } catch (err) {
    // console.error("Error creating class subject teacher:", err);
    return { success: false, error: true, message: "Failed to create assignment" };
  }
};

export const updateClassSubjectTeacher = async (
  CreateState: CreateState,
  data: ClassSubjectTeacherSchema
) => {
  if (!data.id || data.id === 0) {
    return { success: false, error: true, message: "Invalid ID for update" };
  }

  try {
    // Check for duplicate excluding current
    const existing = await prisma.classSubjectTeacher.findFirst({
      where: {
        classId: data.classId,
        subjectId: data.subjectId,
        academicYear: data.academicYear,
        NOT: { id: data.id },
      },
    });

    if (existing) {
      return { 
        success: false, 
        error: true, 
        message: "This subject is already assigned to this class for this academic year" 
      };
    }

    // Verify that class, subject, and teacher exist
    const [classExists, subjectExists, teacherExists] = await Promise.all([
      prisma.class.findUnique({ where: { id: data.classId } }),
      prisma.subject.findUnique({ where: { id: data.subjectId } }),
      prisma.employee.findUnique({ where: { id: data.teacherId } }),
    ]);

    if (!classExists) {
      return { 
        success: false, 
        error: true, 
        message: "Selected class does not exist" 
      };
    }

    if (!subjectExists) {
      return { 
        success: false, 
        error: true, 
        message: "Selected subject does not exist" 
      };
    }

    if (!teacherExists) {
      return { 
        success: false, 
        error: true, 
        message: "Selected teacher does not exist" 
      };
    }

    await prisma.classSubjectTeacher.update({
      where: { id: data.id },
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        academicYear: data.academicYear,
      },
    });

    // revalidatePath("/class");
    // revalidatePath("/subject");
    // revalidatePath("/teacher");
    
    return { success: true, error: false, message: "Assignment updated successfully" };
  } catch (err) {
    // console.error("Error updating class subject teacher:", err);
    return { success: false, error: true, message: "Failed to update assignment" };
  }
};

export const deleteClassSubjectTeacher = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  
  if (!id) {
    return { success: false, error: true, message: "ID is required" };
  }

  try {
    const assignmentId = parseInt(id);

    // Check if assignment has related lessons
    const hasLessons = await prisma.lesson.findFirst({
      where: { classSubjectTeacherId: assignmentId },
    });

    if (hasLessons) {
      return { 
        success: false, 
        error: true, 
        message: "Cannot delete assignment because it has related lessons. Delete the lessons first." 
      };
    }

    await prisma.classSubjectTeacher.delete({
      where: { id: assignmentId },
    });

    // revalidatePath("/class");
    // revalidatePath("/subject");
    // revalidatePath("/teacher");
    
    return { success: true, error: false, message: "Assignment deleted successfully" };
  } catch (err) {
    // console.error("Error deleting class subject teacher:", err);
    return { success: false, error: true, message: "Failed to delete assignment" };
  }
};

// Get all assignments with filters
export const getClassSubjectTeachers = async (filters?: {
  classId?: number;
  subjectId?: number;
  teacherId?: string;
  academicYear?: string;
}) => {
  try {
    const where: any = {};

    if (filters?.classId) where.classId = filters.classId;
    if (filters?.subjectId) where.subjectId = filters.subjectId;
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    if (filters?.academicYear) where.academicYear = filters.academicYear;

    const assignments = await prisma.classSubjectTeacher.findMany({
      where,
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
        teacher: true,
        lessons: true,
      },
      orderBy: [
        { academicYear: 'desc' },
        { class: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return { success: true, data: assignments };
  } catch (err) {
    // console.error("Error fetching assignments:", err);
    return { success: false, error: true, message: "Failed to fetch assignments" };
  }
};

// Get single assignment by ID
export const getClassSubjectTeacherById = async (id: number) => {
  try {
    const assignment = await prisma.classSubjectTeacher.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
        teacher: true,
        lessons: {
          include: {
            _count: {
              select: {
                exams: true,
                assignments: true,
                attendances: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: assignment };
  } catch (err) {
    // console.error("Error fetching assignment:", err);
    return { success: false, error: true, message: "Failed to fetch assignment" };
  }
};