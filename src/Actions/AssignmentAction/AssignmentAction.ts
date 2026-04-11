"use server";

import prisma from "../../lib/db";
import { AssignmentSchema } from "../../lib/FormValidationSchema";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

type CreateState = { 
  success: boolean; 
  error: boolean; 
  message?: string 
};

/**
 * ১. অ্যাসাইনমেন্ট তৈরি করা
 */
export const createAssignment = async (
  currentState: CreateState,
  data: AssignmentSchema
) => {
  try {
    const { userId, role, schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    // যদি ইউজার টিচার হয়, তবে চেক করা যে সে তার নিজের লেসনেই অ্যাসাইনমেন্ট দিচ্ছে কি না
    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: {
          teacherId: userId!,
          id: data.lessonId,
          schoolId: Number(schoolId),
        },
      });

      if (!teacherLesson) {
        return { success: false, error: true, message: "আপনি অন্য কারো লেসনে অ্যাসাইনমেন্ট দিতে পারবেন না।" };
      }
    }

    await prisma.assignment.create({
      data: {
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
        // অ্যাসাইনমেন্টের সাথেও schoolId রাখা ভালো যদি আপনার স্কিমাতে থাকে
        // schoolId: Number(schoolId), 
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Assignment Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ২. অ্যাসাইনমেন্ট আপডেট করা
 */
export const updateAssignment = async (
  currentState: CreateState,
  data: AssignmentSchema
) => {
  try {
    const { userId, role, schoolId } = await getUserRoleAuth();

    if (!schoolId) return { success: false, error: true };

    await prisma.assignment.update({
      where: {
        id: data.id,
        // টিচার হলে শুধু নিজের লেসনের অ্যাসাইনমেন্ট আপডেট করতে পারবে
        ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
      data: {
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.error("Update Assignment Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ৩. অ্যাসাইনমেন্ট ডিলিট করা
 */
export const deleteAssignment = async (
  currentState: CreateState,
  formData: FormData
) => {
  const id = formData.get("id") as string;
  
  if (!id) return { success: false, error: true };

  try {
    const { userId, role, schoolId } = await getUserRoleAuth();

    if (!schoolId) return { success: false, error: true };

    await prisma.assignment.delete({
      where: {
        id: parseInt(id),
        // সিকিউরিটি: টিচার শুধু নিজেরটা ডিলিট করতে পারবে
        ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.error("Delete Assignment Error:", err);
    return { success: false, error: true };
  }
};