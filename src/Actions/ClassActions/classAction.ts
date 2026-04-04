"use server";

import { ClassSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

type CreateState = { 
  success: boolean; 
  error: boolean; 
  message?: string 
};

/**
 * ১. ক্লাস তৈরি করা (Create Class)
 */
export const createClass = async (
  prevState: CreateState,
  data: ClassSchema
) => {
  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    await prisma.class.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: data.gradeId,
        supervisorId: data.supervisorId,
        // ডাটাবেজে এই ক্লাসটি বর্তমান স্কুলের সাথে কানেক্ট করা
        schoolId: Number(schoolId), 
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Class Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ২. ক্লাস আপডেট করা (Update Class)
 */
export const updateClass = async (
  prevState: CreateState,
  data: ClassSchema
) => {
  if (!data.id) {
    return { success: false, error: true, message: "ID missing for update" };
  }

  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true };
    }

    await prisma.class.update({
      where: {
        id: data.id,
        // সিকিউরিটি: শুধুমাত্র নিজের স্কুলের ক্লাসই আপডেট করা যাবে
        schoolId: Number(schoolId), 
      },
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: data.gradeId,
        supervisorId: data.supervisorId,
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.error("Update Class Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ৩. ক্লাস ডিলিট করা (Delete Class)
 */
export const deleteClass = async (
  prevState: CreateState,
  formData: FormData
) => {
  const id = formData.get("id") as string;
  
  if (!id) return { success: false, error: true };

  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true };
    }

    await prisma.class.delete({
      where: {
        id: parseInt(id),
        // সিকিউরিটি: শুধুমাত্র নিজের স্কুলের ক্লাসই ডিলিট করা যাবে
        schoolId: Number(schoolId),
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.error("Delete Class Error:", err);
    return { success: false, error: true };
  }
};