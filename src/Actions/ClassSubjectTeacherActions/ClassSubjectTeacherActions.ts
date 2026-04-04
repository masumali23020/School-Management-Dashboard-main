"use server";

import { ClassSubjectTeacherSchema } from "@/lib/FormValidationSchema";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserRoleAuth } from "@/lib/logsessition";

type CreateState = { success: boolean; error: boolean; message?: string };

/**
 * ১. ক্লাস, বিষয় এবং শিক্ষক এসাইন করা (Create)
 */
export const createClassSubjectTeacher = async (
  prevState: CreateState,
  data: ClassSubjectTeacherSchema
) => {
  try {
    const { schoolId } = await getUserRoleAuth();
    if (!schoolId) return { success: false, error: true, message: "Unauthorized" };

    const sId = Number(schoolId);

    // ১. চেক করা: এই একাডেমিক বছরে এই ক্লাসে এই বিষয় ইতিমধ্যে এসাইন করা আছে কি না
    const existing = await prisma.classSubjectTeacher.findUnique({
      where: {
        classId_subjectId_academicYear: {
          classId: data.classId,
          subjectId: data.subjectId,
          academicYear: data.academicYear,
        },
      },
    });

    if (existing) {
      return { 
        success: false, 
        error: true, 
        message: "এই ক্লাসে এই বিষয়টি ইতিমধ্যে এই বছরে এসাইন করা হয়েছে।" 
      };
    }

    // ২. ভেরিফাই করা: ক্লাস, বিষয় এবং টিচার এই নির্দিষ্ট স্কুলের কি না (Security Check)
    const [classExists, subjectExists, teacherExists] = await Promise.all([
      prisma.class.findUnique({ where: { id: data.classId, schoolId: sId } }),
      prisma.subject.findUnique({ where: { id: data.subjectId, schoolId: sId } }),
      prisma.employee.findUnique({ where: { id: data.teacherId, schoolId: sId } }),
    ]);

    if (!classExists || !subjectExists || !teacherExists) {
      return { success: false, error: true, message: "নির্বাচিত ডাটা আপনার স্কুলের সিস্টেমে নেই।" };
    }

    await prisma.classSubjectTeacher.create({
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        academicYear: data.academicYear,
        // যদি আপনার মডেলে schoolId থাকে তবে এখানে যোগ করুন
        schoolId: sId 
      },
    });

    revalidatePath("/list/class-subject-teacher"); // আপনার লিস্ট পেজ পাথ অনুযায়ী
    return { success: true, error: false, message: "সফলভাবে এসাইন করা হয়েছে।" };
  } catch (err) {
    console.error("Create Assignment Error:", err);
    return { success: false, error: true, message: "প্রযুক্তিগত সমস্যা হয়েছে।" };
  }
};

/**
 * ২. এসাইনমেন্ট আপডেট করা (Update)
 */
export const updateClassSubjectTeacher = async (
  prevState: CreateState,
  data: ClassSubjectTeacherSchema
) => {
  if (!data.id) return { success: false, error: true, message: "ID missing" };

  try {
    const { schoolId } = await getUserRoleAuth();
    const sId = Number(schoolId);

    // ডুপ্লিকেট চেক (নিজেরটা বাদে)
    const existing = await prisma.classSubjectTeacher.findFirst({
      where: {
        classId: data.classId,
        subjectId: data.subjectId,
        academicYear: data.academicYear,
        NOT: { id: data.id },
      },
    });

    if (existing) {
      return { success: false, error: true, message: "এই এসাইনমেন্ট ইতিমধ্যে বিদ্যমান।" };
    }

    await prisma.classSubjectTeacher.update({
      where: { id: data.id },
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        academicYear: data.academicYear,
      },
    });

    revalidatePath("/list/class-subject-teacher");
    return { success: true, error: false, message: "সফলভাবে আপডেট করা হয়েছে।" };
  } catch (err) {
    return { success: false, error: true, message: "আপডেট ব্যর্থ হয়েছে।" };
  }
};

/**
 * ৩. এসাইনমেন্ট ডিলিট করা (Delete)
 */
export const deleteClassSubjectTeacher = async (
  prevState: CreateState,
  formData: FormData
) => {
  const idStr = formData.get("id") as string;
  if (!idStr) return { success: false, error: true, message: "ID missing" };

  try {
    const id = parseInt(idStr);

    // চেক করা: এই এসাইনমেন্টের আন্ডারে কোনো 'Lesson' তৈরি করা আছে কি না
    const hasLessons = await prisma.lesson.findFirst({
      where: { classSubjectTeacherId: id },
    });

    if (hasLessons) {
      return { 
        success: false, 
        error: true, 
        message: "এই এসাইনমেন্ট ডিলিট করা যাবে না কারণ এর অধীনে লেসন/ক্লাস রেকর্ড আছে।" 
      };
    }

    await prisma.classSubjectTeacher.delete({
      where: { id },
    });

    revalidatePath("/list/class-subject-teacher");
    return { success: true, error: false, message: "সফলভাবে ডিলিট করা হয়েছে।" };
  } catch (err) {
    return { success: false, error: true, message: "ডিলিট করা সম্ভব হয়নি।" };
  }
};

/**
 * ৪. লিস্ট নিয়ে আসা (Get All)
 */
export const getClassSubjectTeachers = async (filters?: any) => {
  try {
    const { schoolId } = await getUserRoleAuth();
    const sId = Number(schoolId);

    const assignments = await prisma.classSubjectTeacher.findMany({
      where: {
        ...filters,
        // নিশ্চিত করা শুধু নিজের স্কুলের ডাটা আসছে
        class: { schoolId: sId } 
      },
      include: {
        class: { include: { grade: true } },
        subject: true,
        teacher: true,
        _count: { select: { lessons: true } }
      },
      orderBy: { academicYear: 'desc' },
    });

    return { success: true, data: assignments };
  } catch (err) {
    return { success: false, error: true, message: "ডাটা লোড করা সম্ভব হয়নি।" };
  }
};