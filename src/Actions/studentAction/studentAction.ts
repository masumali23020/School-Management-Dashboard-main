
"use server";


import { clerkClient } from "@clerk/nextjs/server";
import prisma from "../../lib/db";
import { StudentSchema,} from "../../lib/FormValidationSchema";

type CreateState = { success: boolean; error: boolean };


export const createStudent = async (
  CreateState: CreateState,
  data: StudentSchema
) => {
  //  console.log(data);
  try {
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }



    const client = await clerkClient();
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata:{role:"Student"}
    });
    console.log("Created student user ID:", user);
    await prisma.student.create({
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
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,

      
      }
    });

    // revalidatePath("/list/Studentes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  CreateState: CreateState,
  data: StudentSchema
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

    await prisma.student.update({
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
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,

        
      },
    });
    // revalidatePath("/list/Studentes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  CreateState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  console.log("Deleting ID:", id);
  try {
        const client = await clerkClient();
      await client.users.deleteUser(id);
    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    // revalidatePath("/list/Studentes");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
