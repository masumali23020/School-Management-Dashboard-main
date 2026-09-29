// actions/create-school.action.ts
"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import prisma from "@/lib/db";
import { SchoolRegistrationInput } from "@/types/auth";
import { PLAN_DURATIONS_DAYS, SchoolRegistrationSchema } from "@/lib/FormValidationSchema";
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')     // Remove non-word chars
    .replace(/[\s_-]+/g, '-')     // Replace spaces/underscores with dashes
    .replace(/^-+|-+$/g, '');     // Trim dashes from start/end
};
export type CreateSchoolResult =
  | {
      success: true;
      schoolId: number;
      adminId: string;
      schoolName: string;
      adminUsername: string;
      slug: string; // ✅ রিটার্ন টাইপে স্ল্যাগ যোগ করা হলো
    }
  | {
      success: false;
      fieldErrors?: Partial<Record<keyof SchoolRegistrationInput, string[]>>;
      error: string;
    };

export async function createSchoolAction(
  rawInput: SchoolRegistrationInput
): Promise<CreateSchoolResult> {

  // ── ১. Zod Validation ────────────────────────────────────────────────────────
  const parsed = SchoolRegistrationSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Partial<
      Record<keyof SchoolRegistrationInput, string[]>
    >;
    return {
      success: false,
      fieldErrors,
      error: "Validation failed. Please fix the errors below.",
    };
  }

  const data = parsed.data;

  // ── ১.৫ স্ল্যাগ জেনারেট করা ──────────────────────────────────────────────────
  // ইউজার ফর্ম থেকে স্ল্যাগ দিলে ভালো, না দিলে নাম থেকে জেনারেট করে নেওয়া হবে।
  const slug = data.slug ? data.slug.toLowerCase().trim() : generateSlug(data.schoolName);

  // ── ২. Pre-transaction uniqueness checks ─────────────────────────────────────
  // এখানে আমরা স্ল্যাগটিও ডাটাবেজে ডুপ্লিকেট হচ্ছে কি না চেক করে নেবো
  const [existingUsername, existingEiin, existingSlug] = await Promise.all([
    prisma.employee.findFirst({ where: { username: data.adminUsername } }),
    data.eiinNumber
      ? prisma.school.findFirst({ where: { eiinNumber: data.eiinNumber } })
      : Promise.resolve(null),
    prisma.school.findUnique({ where: { slug: slug } }), // ✅ স্ল্যাগ ইউনিক কি না চেক
  ]);

  if (existingUsername) {
    return {
      success: false,
      fieldErrors: { adminUsername: ["Username already taken."] },
      error: "Username already taken. Please choose a different username.",
    };
  }

  if (existingEiin) {
    return {
      success: false,
    
      error: "A school with this EIIN number is already registered.",
    };
  }

  if (existingSlug) {
    return {
      success: false,
  
      error: "This school URL identifier is already in use.",
    };
  }

  // ── ৩. Look up SubscriptionPlan by planType ───────────────────────────────────
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { name: data.planType },
  });

  if (!plan) {
    return {
      success: false,
      error: `Invalid plan type: ${data.planType}. Subscription plan not found in database.`,
    };
  }

  // ── ৪. Compute expiredAt from planType ────────────────────────────────────────
  const durationDays = PLAN_DURATIONS_DAYS[data.planType] ?? 30;
  const expiredAt = new Date();
  expiredAt.setDate(expiredAt.getDate() + durationDays);

  // ── ৫. Hash password BEFORE transaction ──────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(data.adminPassword, 12);
  const adminId = `emp_${nanoid(12)}`;

  // ── ৬. Atomic $transaction ────────────────────────────────────────────────────
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Create School (tenant)
      const school = await tx.school.create({
        data: {
          schoolName:     data.schoolName,
          slug:           slug, // ✅ ডাটাবেজে স্ল্যাগটি সেভ করা হচ্ছে
          shortName:      data.shortName  || null,
          eiinNumber:     data.eiinNumber || null,
          email:          data.email      || null,
          phone:          data.phone      || null,
          address:        data.address    || null,
          planId:         plan.id,
          isActive:       true,
          expiredAt,
          academicSession: new Date().getFullYear().toString(),
        },
      });

      // Step B: Create first Admin Employee for the school
      const admin = await tx.employee.create({
        data: {
          id:          adminId,
          schoolId:    school.id,
          username:    data.adminUsername,
          password:    hashedPassword,
          role:        "ADMIN",
          name:        data.adminName,
          surname:     data.adminSurname,
          email:       data.adminEmail    || null,
          phone:       data.adminPhone    || null,
          address:     data.address       || "",
          bloodType:   "UNKNOWN",
          sex:         "MALE",
          birthday:    new Date("1990-01-01"),
          designation: "School Administrator",
        },
      });

      return { school, admin };
    });

    return {
      success:       true,
      schoolId:      result.school.id,
      adminId:       result.admin.id,
      schoolName:    result.school.schoolName,
      adminUsername: result.admin.username,
      slug:          result.school.slug, // ✅ ফ্রন্টএন্ডে রিডাইরেক্টের জন্য স্ল্যাগ পাস
    };

  } catch (err: unknown) {
    console.error("[createSchoolAction] Transaction error:", err);

    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err
    ) {
      const prismaError = err as { code: string; meta?: { target?: string[] } };

      if (prismaError.code === "P2002") {
        const field = prismaError.meta?.target?.[0] ?? "field";
        const friendly = PRISMA_UNIQUE_FIELD_MESSAGES[field] ??
          `Duplicate value for ${field}.`;
        return { success: false, error: friendly };
      }
    }

    return {
      success: false,
      error:   "Registration failed due to a server error. Please try again.",
    };
  }
}

const PRISMA_UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  username:    "Username already taken. Please choose another.",
  email:       "This email address is already registered.",
  phone:       "This phone number is already in use.",
  eiinNumber:  "A school with this EIIN number already exists.",
  slug:        "This URL slug is already registered by another school.", // ✅ প্রিজমার ইউনিক মেসেজ
};