"use server";

import { SubjectSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";

type CreateState = { success: boolean; error: boolean };

export const createSubject = async (
  currentState: CreateState,
  data: SubjectSchema,
) => {
  try {
    await prisma?.subject.create({
      data: {
        id: data.id,
        name: data.name,
      },
    });
    console.log("Subject created successfully!", data);
    //  can not work when use a react tostify message

    // revalidatePath("/list/subjects")
    return {
      success: true,
      error: false,
    };
  } catch (error) {
    // console.log("Error creating subject: ", error);
    return {
      success: false,
      error: true,
    };
  }
};
export const updateSubject = async (
  currentState: CreateState,
  data: SubjectSchema
) => {
  try {
    if (!data.id) {
      throw new Error("Subject ID missing");
    }

    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};



