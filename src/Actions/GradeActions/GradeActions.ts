import { Label } from '@/components/ui/label';

"use server";


import prisma from "../../lib/db";
import { GradeSchema } from "../../lib/FormValidationSchema";


type CreateState = { success: boolean; error: boolean };

export const createGrade = async (
  currentState: CreateState,
  data: GradeSchema
) => {

  try {
   

    await prisma.grade.create({
      data: {
        // id: data?.id,
        level: data?.level,
       
      },
    });

    // revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateGrade = async (
  currentState: CreateState,
  data: GradeSchema
) => {

  try {

    await prisma.grade.update({
      where: {
        id: data.id,
      },
      data: {
        level: data.level,
     
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteGrade = async (
  currentState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.grade.delete({
      where: {
        id: parseInt(id),
        // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};