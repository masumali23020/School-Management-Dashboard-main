
"use server";

import { ClassSchema, SubjectSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";

type CreateState = { success: boolean; error: boolean };


export const createClass = async (
  CreateState: CreateState,
  data: ClassSchema
) => {
  try {
    await prisma.class.create({
      data,
    });

    // revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  CreateState: CreateState,
  data: ClassSchema
) => {
     if (!data.id || data.id === 0) {
    throw new Error("Invalid ID for update");
  }
  console.log("Updating ID:", data.id);
  try {
    await prisma.class.update({
      where: {
        id: data.id,
      },
      data,
    });

    // revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  console.log("Deleting ID:", id);
  try {
    await prisma.class.delete({
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
