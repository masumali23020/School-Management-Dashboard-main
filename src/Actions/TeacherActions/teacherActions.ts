
"use server";


import { clerkClient } from "@clerk/nextjs/server";
import prisma from "../../lib/db";
import { TeacherSchema } from "../../lib/FormValidationSchema";

type CreateState = { success: boolean; error: boolean };


export const createTeacher = async (
  CreateState: CreateState,
  data: TeacherSchema
) => {
  try {
    const client = await clerkClient();
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata:{role:"teacher"}
    });
    await prisma.teacher.create({
      data:{
           id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
       subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      }
    });

    // revalidatePath("/list/Teacheres");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  CreateState: CreateState,
  data: TeacherSchema
) => {
     if (!data.id || data.id === "0") {

    return { success: false, error: true };
  }
  console.log("Updating ID:", data.id);
  try {
    const client = await clerkClient();
   const user = await client.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    // revalidatePath("/list/Teacheres");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  console.log("Deleting ID:", id);
  try {
        const client = await clerkClient();
      await client.users.deleteUser(id);


    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });

    // revalidatePath("/list/Teacheres");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
