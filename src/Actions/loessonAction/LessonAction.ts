
"use server";

import { ClassSchema, LessonSchema, SubjectSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";

type CreateState = { success: boolean; error: boolean };


export const createLesson = async (
  CreateState: CreateState,
  data: LessonSchema
) => {
  try {
    await prisma.lesson.create({
      data:{
        // id: data?.id,
        name: data?.name,
        subjectId: data?.subjectId,
        teacherId: data?.teacherId,
        classId: data?.classId,
        day: data?.day?.toUpperCase() as any,
        startTime: data?.startTime,
        endTime: data?.endTime,
        
      }
    });

    // revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateLesson = async (
  CreateState: CreateState,
  data: LessonSchema
) => {
     if (!data.id || data.id === 0) {
    throw new Error("Invalid ID for update");
  }
  console.log("Updating ID:", data.id);
  try {
    await prisma.lesson.update({
      where: {
        id: data.id,
      },
      data:{
        // id: data?.id,
        name: data?.name,
        subjectId: data?.subjectId,
        teacherId: data?.teacherId,
        classId: data?.classId,
        day: data?.day?.toUpperCase() as any,
        startTime: data?.startTime,
        endTime: data?.endTime,
        
      }
    });

    // revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteLesson = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  console.log("Deleting ID:", id);
  try {
    await prisma.lesson.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
