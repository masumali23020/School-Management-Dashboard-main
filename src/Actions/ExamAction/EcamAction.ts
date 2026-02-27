
"use server";


import { clerkClient } from "@clerk/nextjs/server";
import prisma from "../../lib/db";
import { ExamSchema } from "../../lib/FormValidationSchema";
import { getUserRole } from "../../lib/utlis";

type CreateState = { success: boolean; error: boolean };


export const createExam = async (
  CreateState: CreateState,
  data: ExamSchema
) => {
      const {role, userId} = await getUserRole()
  try {
    if(role === "teacher"){
    const teacherLesson = await prisma.lesson.findFirst({
      where: {
        teacherId: userId!,
      },
    });

    if (!teacherLesson) {
      return { success: false, error: true };
    }
}

 
    await prisma.exam.create({
      data:{
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId

      }
    });

    // revalidatePath("/list/Exames");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  CreateState: CreateState,
  data: ExamSchema
) => {
      const {role, userId} = await getUserRole()
  try {
    if(role === "teacher"){
    const teacherLesson = await prisma.lesson.findFirst({
      where: {
        teacherId: userId!,
      },
    });

    if (!teacherLesson) {
      return { success: false, error: true };
    }
}

 
    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data:{
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId

      }
    });

    // revalidatePath("/list/Exames");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
//   console.log("Deleting ID:", id);
  try {

    await prisma.exam.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/Exames");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
