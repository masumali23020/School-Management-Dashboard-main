// app/api/sms/send/route.ts
// Example of a feature-gated API Route — only POPULAR plan can send SMS

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { guardFeatureAccess } from "@/lib/subscription-guard";
import  prisma  from "@/lib/db";
import type { SessionUser } from "@/types/auth";

export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Feature guard: only POPULAR plan ────────────────────────────────────────
  const blocked = guardFeatureAccess(user.planType, "sms_panel");
  if (blocked) return blocked; // Returns 403 with upgrade message

  // ── Role guard: only ADMIN and CASHIER can send SMS ──────────────────────────
  if (!["ADMIN", "CASHIER"].includes(user.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Insufficient role to send SMS." },
      { status: 403 }
    );
  }

  // ── SMS balance check ────────────────────────────────────────────────────────
  const school = await prisma.school.findUnique({
    where:  { id: user.schoolId },
    select: { smsBalance: true },
  });

  if (!school || school.smsBalance <= 0) {
    return NextResponse.json(
      { error: "NO_SMS_BALANCE", message: "Insufficient SMS balance." },
      { status: 402 }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  const { receiverNo, message } = body ?? {};

  if (!receiverNo || !message) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "receiverNo and message are required." },
      { status: 400 }
    );
  }

  // ── Send SMS + deduct balance + log (all atomic) ─────────────────────────────
  const [smsLog] = await prisma.$transaction([
    prisma.sMSLog.create({
      data: {
        schoolId:   user.schoolId,
        receiverNo,
        message,
        status:     "SENT",
      },
    }),
    prisma.school.update({
      where: { id: user.schoolId },
      data:  { smsBalance: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ success: true, smsLogId: smsLog.id });
}