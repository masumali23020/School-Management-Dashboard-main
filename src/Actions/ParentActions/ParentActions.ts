"use server";

import { clerkClient } from "@clerk/nextjs/server";
import prisma from "../../lib/db";
import { ParentSchema } from "../../lib/FormValidationSchema";
// import { revalidatePath } from "next/cache";

type CreateState = { success: boolean; error: boolean };

export const createParent = async (
  prevState: CreateState,
  data: ParentSchema
) => {
  try {
    // console.log("Creating parent with data:", data);
    
    const client = await clerkClient();
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "parent" }
    });

    console.log("Created Clerk user:", user.id);

    // First create the parent
    const parent = await prisma.parent.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      }
    });

    // console.log("Created parent in DB:", parent);

    // Then update all selected students with this parentId
    if (data.studentIds && data.studentIds.length > 0) {
      const updateStudents = await prisma.student.updateMany({
        where: {
          id: {
            in: data.studentIds
          }
        },
        data: {
          parentId: user.id
        }
      });
    //   console.log(`Updated ${updateStudents.count} students with parentId`);
    }

    // revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    // console.error("Error creating parent:", err);
    return { success: false, error: true };
  }
};

export const updateParent = async (
  prevState: CreateState,
  data: ParentSchema
) => {
  if (!data.id || data.id === "0") {
    console.error("Invalid parent ID for update");
    return { success: false, error: true };
  }

  try {
    // console.log("Updating parent with data:", data);
    
    const client = await clerkClient();
    await client.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    // Update parent info
    await prisma.parent.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    // First remove parentId from all students that were previously connected
    await prisma.student.updateMany({
      where: {
        parentId: data.id
      },
      data: {
        parentId: null
      }
    });

    // Then update only the selected students with this parentId
    if (data.studentIds && data.studentIds.length > 0) {
      const updateStudents = await prisma.student.updateMany({
        where: {
          id: {
            in: data.studentIds
          }
        },
        data: {
          parentId: data.id
        }
      });
    //   console.log(`Updated ${updateStudents.count} students with parentId`);
    }

    // revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    // console.error("Error updating parent:", err);
    return { success: false, error: true };
  }
};

export const deleteParent = async (
  prevState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  
  try {
    // console.log("Deleting parent with id:", id);
    
    // First remove parentId from all students
    await prisma.student.updateMany({
      where: {
        parentId: id
      },
      data: {
        parentId: null
      }
    });

    // Delete parent from DB
    await prisma.parent.delete({
      where: {
        id: id,
      },
    });

    // Delete from Clerk
    const client = await clerkClient();
    await client.users.deleteUser(id);

    // revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    // console.error("Error deleting parent:", err);
    return { success: false, error: true };
  }
};