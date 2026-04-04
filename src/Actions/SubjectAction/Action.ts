"use server";

import { SubjectSchema } from "../../lib/FormValidationSchema";
import prisma from "../../lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

type CreateState = { 
  success: boolean; 
  error: boolean; 
  message?: string 
};

/**
 * ১. নতুন সাবজেক্ট তৈরি করা
 */
export const createSubject = async (
  prevState: CreateState,
  data: SubjectSchema
) => {
  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "Unauthorized" };
    }

    await prisma.subject.create({
      data: {
        name: data.name,
        schoolId: Number(schoolId),
        // যদি টিচারদের কানেক্ট করতে চান (Many-to-Many)
        // teachers: {
        //   connect: data.teachers?.map((teacherId) => ({ id: teacherId })) || [],
        // },
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Subject Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ২. সাবজেক্ট আপডেট করা
 */
export const updateSubject = async (
  prevState: CreateState,
  data: SubjectSchema
) => {
  if (!data.id) return { success: false, error: true };

  try {
    const { schoolId } = await getUserRoleAuth();

    await prisma.subject.update({
      where: {
        id: data.id,
        schoolId: Number(schoolId), // সিকিউরিটি চেক
      },
      data: {
        name: data.name,
        // teachers: {
        //   // আগের টিচারদের লিস্ট মুছে নতুন লিস্ট সেট করা
        //   set: data.teachers?.map((teacherId) => ({ id: teacherId })) || [],
        // },
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.error("Update Subject Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ৩. সাবজেক্ট ডিলিট করা
 */
export const deleteSubject = async (
  prevState: CreateState,
  formData: FormData
) => {
  const id = formData.get("id") as string;
  
  if (!id) return { success: false, error: true };

  try {
    const { schoolId } = await getUserRoleAuth();

    await prisma.subject.delete({
      where: {
        id: parseInt(id),
        schoolId: Number(schoolId), // নিশ্চিত করা যে নিজের স্কুলের সাবজেক্ট ডিলিট হচ্ছে
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.error("Delete Subject Error:", err);
    return { success: false, error: true, message: "এই সাবজেক্টের সাথে অন্য ডাটা যুক্ত থাকায় ডিলিট করা যাচ্ছে না।" };
  }
};