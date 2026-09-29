"use server";

import prisma from "../../lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

export const bulkAttendance = async (prevState: any, formData: FormData) => {
  try {
    // ১. বর্তমান ইউজারের schoolId এবং অথরাইজেশন চেক
    const { schoolId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { success: false, error: true, message: "Unauthorized: School ID not found." };
    }

    const rawData = formData.get("attendances");
    
    if (!rawData) {
      return { success: false, error: true, message: "No data provided" };
    }

    const attendances = JSON.parse(rawData as string);

    if (!Array.isArray(attendances) || attendances.length === 0) {
      return { success: false, error: true, message: "No changes to save" };
    }

    // ২. ট্রানজেকশন অপারেশনগুলো তৈরি করা
    const operations = attendances.map((item: any) => {
      // টাইমজোন ইস্যু এড়াতে তারিখের সময় জিরো করে দেওয়া ভালো
      const dateObj = new Date(item.date);
      dateObj.setHours(0, 0, 0, 0); 
      
      return prisma.attendance.upsert({
        where: {
          // আপনার মডেলে থাকা ইউনিক ইনডেক্স অনুযায়ী
          date_studentId: {
            date: dateObj,
            studentId: item.studentId,
          },
        },
        create: {
          studentId: item.studentId,
          date: dateObj,
          present: item.present,
          // লজিক: উপস্থিত না থাকলে (False) অনুপস্থিত (Absent) হিসেবে গণ্য হবে
          // যদি আপনার মডেলে schoolId থাকে তবে এখানে যোগ করুন
          // schoolId: Number(schoolId), 
        },
        update: {
          present: item.present,
        },
      });
    });

    // ৩. সব অপারেশন একসাথে ডাটাবেজে পাঠানো
    await prisma.$transaction(operations);

    // ৪. পাথ রিভ্যালিডেট করা (আপনার রাউট অনুযায়ী পাথটি চেক করুন)
    revalidatePath("/attendance/monthly"); 
    revalidatePath("/list/attendance");

    return { 
      success: true, 
      error: false, 
      message: `Successfully saved ${attendances.length} records.` 
    };
    
  } catch (error: any) {
    console.error("Attendance Save Error:", error);
    return { 
      success: false, 
      error: true, 
      message: "ডাটাসেইভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" 
    };
  }
};