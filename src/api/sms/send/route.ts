import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { guardFeatureAccess } from "@/lib/subscription-guard";
import prisma from "@/lib/db";
import type { SessionUser } from "@/types/auth";

export async function POST(req: NextRequest) {
  // ── ১. অথেন্টিকেশন চেক ───────────────────────────────────────────────────
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  // ইউজার না থাকলে বা লগইন না থাকলে সরাসরি আনঅথরাইজড
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── ২. ফিচার গার্ড (Plan Check) ──────────────────────────────────────────
  // user.planType যদি undefined হওয়ার সম্ভাবনা থাকে, তবে একটি ডিফল্ট ভ্যালু (যেমন: 'FREE') দিতে পারেন
  // অথবা টাইপ কাস্টিং করে দিতে পারেন যদি আপনি নিশ্চিত হন এটা ডাটাবেজে আছে।
  const blocked = guardFeatureAccess(user.planType, "sms_panel");
  if (blocked) return blocked; // এটি ৪০৩ রেসপন্স রিটার্ন করবে যদি এক্সেস না থাকে

  // ── ৩. রোল গার্ড (Role Check) ───────────────────────────────────────────
  // শুধুমাত্র ADMIN এবং CASHIER এসএমএস পাঠাতে পারবে
  if (!["ADMIN", "CASHIER"].includes(user.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "এই এসএমএস পাঠানোর ক্ষমতা আপনার নেই।" },
      { status: 403 }
    );
  }

  // ── ৪. এসএমএস ব্যালেন্স চেক ──────────────────────────────────────────────
  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { smsBalance: true },
  });

  if (!school || school.smsBalance <= 0) {
    return NextResponse.json(
      { error: "NO_SMS_BALANCE", message: "আপনার পর্যাপ্ত এসএমএস ব্যালেন্স নেই।" },
      { status: 402 }
    );
  }

  // ── ৫. বডি পার্সিং ──────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  const { receiverNo, message } = body ?? {};

  if (!receiverNo || !message) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "receiverNo এবং message প্রয়োজন।" },
      { status: 400 }
    );
  }

  try {
    // ── ৬. এসএমএস পাঠানো + ব্যালেন্স কমানো (অ্যাটমিক ট্রানজেকশন) ──────────────
    const [smsLog] = await prisma.$transaction([
      prisma.sMSLog.create({
        data: {
          schoolId: user.schoolId,
          receiverNo,
          message,
          status: "SENT", // রিয়েল লাইফে এখানে API স্ট্যাটাস বসবে
        },
      }),
      prisma.school.update({
        where: { 
          id: user.schoolId,
          smsBalance: { gt: 0 } // ডাবল চেক: ব্যালেন্স ০ এর বেশি থাকলেই আপডেট হবে
        },
        data: { smsBalance: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ 
      success: true, 
      smsLogId: smsLog.id,
      remainingBalance: school.smsBalance - 1 
    });

  } catch (error) {
    console.error("SMS_SEND_ERROR:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "এসএমএস পাঠানো সম্ভব হয়নি।" },
      { status: 500 }
    );
  }
}