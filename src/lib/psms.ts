"use server";

import prisma from "@/lib/db";

const API_KEY = "6f4U2UAoOr3aSZjm9Td7";
const SENDER_ID = "8809648908024";
const SMS_URL = "http://bulksmsbd.net/api/smsapimany"; // ← Many-to-Many API

export type SMSType = "examFee" | "meeting" | "school" | "custom";

// ─── SMS Message Templates ─────────────────────────────────────────────────────
function getSMSMessage(type: SMSType, studentName: string, customMessage?: string): string {
  switch (type) {
    case "examFee":
      return `প্রিয় অভিভাবক, আপনার সন্তান ${studentName} এর পরীক্ষার ফি এখনো পরিশোধ হয়নি। অনুগ্রহ করে দ্রুত স্কুলে যোগাযোগ করুন। ধন্যবাদ।`;
    case "meeting":
      return `প্রিয় অভিভাবক, আপনার সন্তান ${studentName} এর বিষয়ে একটি অভিভাবক সভা আয়োজন করা হয়েছে। অনুগ্রহ করে স্কুলে যোগাযোগ করুন। ধন্যবাদ।`;
    case "school":
      return `প্রিয় অভিভাবক, আপনার সন্তান ${studentName} এর বিষয়ে স্কুল থেকে একটি গুরুত্বপূর্ণ নোটিশ রয়েছে। অনুগ্রহ করে স্কুলে যোগাযোগ করুন। ধন্যবাদ।`;
    case "custom":
      return customMessage || "স্কুল থেকে একটি বার্তা পাঠানো হয়েছে।";
    default:
      return "স্কুল থেকে একটি বার্তা পাঠানো হয়েছে।";
  }
}

// ─── Phone Number Formatter ────────────────────────────────────────────────────
function formatBDPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;           // 8801XXXXXXXXX ✓
  if (digits.startsWith("01")) return `88${digits}`;    // 01XXXXXXXXX → 8801XXXXXXXXX
  if (digits.startsWith("1") && digits.length === 10) return `880${digits}`; // 1XXXXXXXXX
  return digits;
}

// ─── Main Server Action ────────────────────────────────────────────────────────
export async function sendBulkSMSToParents(
  studentIds: string[],
  smsType: SMSType,
  customMessage?: string
): Promise<{ success: boolean; sent: number; failed: number; message: string }> {

  if (!studentIds || studentIds.length === 0) {
    return { success: false, sent: 0, failed: 0, message: "কোনো শিক্ষার্থী নির্বাচন করা হয়নি।" };
  }

  // ─── DB থেকে selected students আনো ──────────────────────────────────────────
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      name: true,
      parentPhone: true, // ← আপনার Prisma schema-তে parent phone field-এর নাম দিন
    },
  });

  // ─── নম্বর নেই এমন students বাদ দাও ─────────────────────────────────────────
  const skipped: string[] = [];
  const messages = students
    .filter((s) => {
      if (!s.parentPhone) { skipped.push(s.name); return false; }
      return true;
    })
    .map((s) => ({
      to: formatBDPhone(s.parentPhone!),
      message: getSMSMessage(smsType, s.name, customMessage),
    }));

  if (messages.length === 0) {
    return { success: false, sent: 0, failed: students.length, message: "❌ কোনো অভিভাবকের ফোন নম্বর পাওয়া যায়নি।" };
  }

  // ─── একটাই API Call দিয়ে সবাইকে SMS ─────────────────────────────────────────
  try {
    const response = await fetch(SMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: API_KEY,
        senderid: SENDER_ID,
        messages, // [{ to: "88016...", message: "প্রিয় অভিভাবক, আপনার সন্তান Rahim..." }, ...]
      }),
    });

    const result = await response.json();
    console.log("📨 SMS API Response:", result);

    if (result.response_code === 202) {
      return {
        success: true,
        sent: messages.length,
        failed: skipped.length,
        message: `✅ ${messages.length} জন অভিভাবককে SMS সফলভাবে পাঠানো হয়েছে।${skipped.length > 0 ? ` (${skipped.length} জনের নম্বর ছিল না)` : ""}`,
      };
    } else {
      return {
        success: false,
        sent: 0,
        failed: messages.length,
        message: `❌ SMS ব্যর্থ: ${result.error_message || "অজানা সমস্যা"} (Code: ${result.response_code})`,
      };
    }
  } catch (error) {
    console.error("SMS Error:", error);
    return { success: false, sent: 0, failed: messages.length, message: "❌ SMS সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে।" };
  }
}