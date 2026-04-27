"use server";

import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

export async function deleteStudent(studentId: string) {
  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, message: "Unauthorized access." };
    }

    // ১. স্টুডেন্টটি এই স্কুলের কি না তা নিশ্চিত হওয়া
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.schoolId !== Number(schoolId)) {
      return { success: false, message: "Student not found in your school." };
    }

    // ২. Prisma Transaction ব্যবহার করে রিলেটেড ডাটা সহ ডিলিট করা
    await prisma.$transaction([
      // স্টুডেন্টের সাথে যুক্ত সব টেবিলের ডাটা আগে ডিলিট করুন
      // আপনার স্কিমা অনুযায়ী টেবিলের নামগুলো নিশ্চিত হয়ে নিন
      prisma.attendance.deleteMany({ where: { studentId } }),
      prisma.result.deleteMany({ where: { studentId } }),
      prisma.feePayment.deleteMany({ where: { studentId } }),
      prisma.studentClassHistory?.deleteMany({ where: { studentId } }), // যদি থাকে
      
      // সবশেষে মেইন স্টুডেন্ট রেকর্ড ডিলিট
      prisma.student.delete({ where: { id: studentId } }),
    ]);

    revalidatePath("/list/students");
    return { success: true, message: "Student and all associated records deleted successfully!" };

  } catch (err: any) {
    console.error("DELETE ERROR:", err);
    return { 
      success: false, 
      message: "Database Error: Could not remove linked records. Please check if other data depends on this student." 
    };
  }
}