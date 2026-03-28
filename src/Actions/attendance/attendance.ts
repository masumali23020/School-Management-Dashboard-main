"use server";

import prisma from "../../lib/db"; // আপনার prisma ক্লায়েন্ট পাথ চেক করে নিন
import { revalidatePath } from "next/cache";


export const bulkAttendance = async (prevState: any, formData: FormData) => {
  try {
    const rawData = formData.get("attendances");
    
    if (!rawData) {
      return { success: false, error: true, message: "No data provided" };
    }

    const attendances = JSON.parse(rawData as string);

    if (!Array.isArray(attendances) || attendances.length === 0) {
      return { success: false, error: true, message: "No changes to save" };
    }

    // Transaction ব্যবহার করে সব ডাটা একসাথে সেভ করা
    const operations = attendances.map((item: any) => {
      const dateObj = new Date(item.date);
      // প্রয়োজনে টাইমজোন ঠিক করতে হতে পারে, তবে ISO string সাধারণত কাজ করে
      
      return prisma.attendance.upsert({
        // যেহেতু আপনার মডেলে @@unique([date, studentId]) আছে
        where: {
          date_studentId: {
            date: dateObj,
            studentId: item.studentId,
          },
        },
        // যদি ডাটা না থাকে তবে তৈরি করবে
        create: {
          studentId: item.studentId,
          date: dateObj,
          present: item.present,
          lessonId: item.lessonId || null, // যদি lessonId থাকে
        },
        // যদি ডাটা থাকে তবে আপডেট করবে
        update: {
          present: item.present,
        },
      });
    });

    await prisma.$transaction(operations);

    revalidatePath("/attendance/monthly"); // পেজ রিফ্রেশ করে নতুন ডাটা দেখাবে

    return { 
      success: true, 
      error: false, 
      message: `Successfully saved ${attendances.length} attendance records.` 
    };
    
  } catch (error: any) {
    console.error("Attendance Save Error:", error);
    return { 
      success: false, 
      error: true, 
      message: error.message || "Database error occurred" 
    };
  }
};