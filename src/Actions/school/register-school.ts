// actions/register-school.ts
"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import prisma from "@/lib/db";
import { SchoolRegistrationInput } from "@/types/auth";

// রিটার্ন টাইপ ইন্টারফেস
export interface RegisterSchoolResult {
  success: boolean;
  schoolId?: number;
  adminId?: string;
  slug?: string; // রিডাইরেক্ট করার জন্য স্ল্যাগ দরকার
  error?: string;
}

/**
 * স্ল্যাগ জেনারেট করার ফাংশন
 * উদাহরণ: "Thana Para School" -> "thana-para-school"
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")     // স্পেশাল ক্যারেক্টার রিমুভ
    .replace(/[\s_-]+/g, "-")      // স্পেস এবং আন্ডারস্কোরকে হাইফেন করা
    .replace(/^-+|-+$/g, "");      // শুরু বা শেষের হাইফেন রিমুভ
};

export async function registerSchool(
  input: SchoolRegistrationInput
): Promise<RegisterSchoolResult> {
  const {
    schoolName,
    planId,
    expiredAt,
    adminUsername,
    adminPassword,
    adminName,
    adminSurname,
  } = input;

  try {
    // ── ১. ইউনিক স্ল্যাগ তৈরি করা ──────────────────────────────────────────
    let slug = generateSlug(schoolName);

    // চেক করা যে এই স্ল্যাগটি ডাটাবেজে আগে থেকে আছে কি না
    const existingSchool = await prisma.school.findUnique({
      where: { slug: slug },
    });

    // যদি স্ল্যাগটি আগে থেকেই থাকে, তবে ৪ অক্ষরের র‍্যান্ডম আইডি যোগ করা
    if (existingSchool) {
      slug = `${slug}-${nanoid(4)}`;
    }

    // ── ২. সিকিউরিটি এবং আইডি জেনারেশন ─────────────────────────────────────
    // পাসওয়ার্ড হ্যাশ করা (CPU-bound কাজ ট্রানজ্যাকশনের বাইরে রাখা ভালো)
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // এডমিনের জন্য একটি ইউনিক আইডি
    const adminId = `emp_${nanoid(12)}`;

    // ── ৩. অ্যাটমিক ট্রানজ্যাকশন (Prisma $transaction) ──────────────────────
    // এখানে স্কুল এবং এডমিন একসাথেই তৈরি হবে। যদি একটিও ফেইল করে, তবে ডাটাবেজে কিছুই সেভ হবে না।
    const result = await prisma.$transaction(async (tx) => {
      
      // Step A: স্কুল (Tenant) তৈরি করা
      const school = await tx.school.create({
        data: {
          schoolName,
          slug: slug, // আমাদের তৈরি করা সুন্দর ইউআরএল ফ্রেন্ডলি নাম
          planId: Number(planId), // নিশ্চিত করা যে এটি সংখ্যা
          expiredAt: expiredAt ? new Date(expiredAt) : null,
          academicSession: new Date().getFullYear().toString(),
          isActive: true,
        },
      });

      // Step B: স্কুলের জন্য প্রথম এডমিন (Employee) তৈরি করা
      const admin = await tx.employee.create({
        data: {
          id: adminId,
          schoolId: school.id,
          username: adminUsername,
          password: hashedPassword,
          role: "ADMIN",
          name: adminName,
          surname: adminSurname,
          address: "", // ডিফল্ট খালি রাখা হলো
          bloodType: "UNKNOWN",
          sex: "MALE",
          birthday: new Date("1990-01-01"),
          designation: "Super Administrator",
        },
      });

      return { school, admin };
    });

    // সব ঠিক থাকলে সাকসেস মেসেজ এবং স্ল্যাগ রিটার্ন করা
    return {
      success: true,
      schoolId: result.school.id,
      adminId: result.admin.id,
      slug: result.school.slug,
    };

  } catch (err: unknown) {
    console.error("[registerSchool] Error details:", err);

    // প্রিজমার ইউনিক কনস্ট্রেইন্ট এরর হ্যান্ডেল করা (যেমন: EIIN বা Username ডুপ্লিকেট হলে)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return {
        success: false,
        error: "এই ইউজারনেম অথবা স্কুলের তথ্য আমাদের সিস্টেমে আগে থেকেই রয়েছে।",
      };
    }

    return {
      success: false,
      error: "রেজিস্ট্রেশন করতে সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}