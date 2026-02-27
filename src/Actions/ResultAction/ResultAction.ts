
"use server";

import { ClassSchema, LessonSchema, ResultSchema, SubjectSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";

type CreateState = { success: boolean; error: boolean };


export const createResult = async (
  CreateState: CreateState,
  data: ResultSchema
) => {
  try {
    await prisma.result.create({
      data:{
        id: data?.id,
       
        score: data?.score,
        studentId: data?.studentId,
        examId: data?.examId,
        assignmentId: data?.assignmentId,
        
      }
    });

    // revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateResult = async (
  CreateState: CreateState,
  data: ResultSchema
) => {
     if (!data.id || data.id === 0) {
    throw new Error("Invalid ID for update");
  }
  console.log("Updating ID:", data.id);
  try {
    await prisma.result.update({
      where: {
        id: data.id,
      },
      data:{
        id: data?.id,
        score: data?.score,
        studentId: data?.studentId,
        examId: data?.examId,
        assignmentId: data?.assignmentId,
        
      }
    });

    // revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteResult = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  console.log("Deleting ID:", id);
  try {
    await prisma.result.delete({
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
