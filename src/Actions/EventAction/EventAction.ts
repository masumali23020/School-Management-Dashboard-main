
"use server";


import { getUserRoleAuth } from "@/lib/logsessition";
import prisma from "../../lib/db";
import { EventSchema } from "../../lib/FormValidationSchema";


type CreateState = { success: boolean; error: boolean };

export const createEvent = async (
  currentState: CreateState,
  data: EventSchema
) => {
  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "Unauthorized!" };
    }

    // ১. ভ্যালিডেশন: যদি classId দেওয়া থাকে, তবে চেক করা যে ওই ক্লাসটি এই স্কুলের কিনা
    if (data.classId) {
      const classExists = await prisma.class.findFirst({
        where: {
          id: data.classId,
          schoolId: Number(schoolId),
        },
      });

      if (!classExists) {
        return { success: false, error: true, message: "এই ক্লাসটি আপনার স্কুলের নয়।" };
      }
    }

    // ২. ইভেন্ট তৈরি
    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId || null,
        schoolId: Number(schoolId),
        // আপনি যদি পাবলিক ইভেন্ট হিসেবে দেখাতে চান তবে এটি যোগ করুন
        isPublic: true, 
      },
    });

    // revalidatePath("/list/events");
    return { success: true, error: false, message: "ইভেন্ট তৈরি হয়েছে।" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "কিছু ভুল হয়েছে।" };
  }
};

export const updateEvent = async (
  currentState: CreateState,
  data: EventSchema
) => {

  try {

    await prisma.event.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteEvent = async (
  currentState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.event.delete({
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