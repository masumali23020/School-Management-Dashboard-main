// app/api/send-sms/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";

// ─────────────────────────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────────
const RequestSchema = z.object({
  studentIds:    z.array(z.string()).min(1, "Select at least one student"),
  messageType:   z.enum(["exam-fee","meeting","school-notice","result","attendance","fee-reminder","custom"]),
  customMessage: z.string().min(3).max(640).optional(),
  examTitle:     z.string().optional(),
});

const MessageSchema = z.object({
  to:      z.string().regex(/^8801[3-9]\d{8}$/, "Invalid BD phone"),
  message: z.string().min(1).max(640),
});

// BulkSMS BD payload shape (POST /smsapimany)
const BulkPayloadSchema = z.object({
  api_key:  z.string().min(1),
  senderid: z.string().regex(/^\d+$/, "Sender ID must be numeric"),
  messages: z.array(MessageSchema).min(1),
});

type BulkMessage = z.infer<typeof MessageSchema>;

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function normaliseBDPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  let n: string;
  if      (d.startsWith("880") && d.length === 13) n = d;
  else if (d.startsWith("0")   && d.length === 11) n = "88" + d;
  else if (d.length === 10     && d.startsWith("1")) n = "880" + d;
  else return null;
  return /^8801[3-9]\d{8}$/.test(n) ? n : null;
}

function buildMessage(
  student:       any,
  messageType:   string,
  customMessage?: string,
  examInfo?:     any
): string {
  const fullName      = `${student.name} ${student.surname}`;
  const parentName    = student.parent?.name || "Dear Parent";
  const className     = student.class?.name  || "N/A";
  const gradeLevel    = student.grade?.level || "";
  const history       = student.classHistory?.[0];
  const rollNumber    = history?.rollNumber?.toString() || "N/A";
  const academicYear  = history?.academicYear || student.school?.academicSession || "2025-2026";
  const schoolName    = student.school?.shortName || student.school?.schoolName || "School";
  const schoolPhone   = student.school?.phone    || "";
  const schoolAddress = student.school?.address  || "";

  const info = [
    `Student : ${fullName}`,
    `Class   : ${className}`,
    rollNumber !== "N/A" ? `Roll    : ${rollNumber}` : null,
    gradeLevel           ? `Grade   : ${gradeLevel}` : null,
    `Session : ${academicYear}`,
    `School  : ${schoolName}`,
  ].filter(Boolean).join("\n");

  const sig = [
    `---`,
    schoolName,
    schoolPhone   ? `Tel : ${schoolPhone}`   : null,
    schoolAddress ? `Addr: ${schoolAddress}` : null,
  ].filter(Boolean).join("\n");

  const examLine = examInfo?.title
    ? `Exam : ${examInfo.title}\nDate : ${new Date(examInfo.startTime).toLocaleDateString("en-BD")}`
    : null;

  const tpl: Record<string, (string | null)[]> = {
    "exam-fee":      [`Dear ${parentName},`, ``, `Exam fees for your child are due. Please pay at your earliest convenience.`, ``, info, examLine, ``, sig],
    "meeting":       [`Dear ${parentName},`, ``, `You are invited to a parents-teacher meeting for your child.`, ``, info, ``, `Please attend on the scheduled date.`, sig],
    "school-notice": [`Dear ${parentName},`, ``, `Important school notice for your child.`, ``, info, ``, `Please check the school notice board or contact the class teacher.`, sig],
    "result":        [`Dear ${parentName},`, ``, `Exam results have been published.`, ``, info, examLine, ``, `Visit the student portal or contact school for details.`, sig],
    "attendance":    [`Dear ${parentName},`, ``, `Attendance alert. Please ensure regular attendance.`, ``, info, ``, `Contact the class teacher for attendance details.`, sig],
    "fee-reminder":  [`Dear ${parentName},`, ``, `Fee payment reminder. Please clear outstanding fees.`, ``, info, ``, `Contact the school office for details.`, sig],
    "custom":        [customMessage || "Message from school", ``, info, ``, sig],
  };

  return (tpl[messageType] ?? tpl["school-notice"])
    .filter((l): l is string => l !== null && l !== undefined)
    .join("\n")
    .trim();
}

// ─────────────────────────────────────────────────────────────────
// POST /api/send-sms
// ─────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {

    // ── 1. Parse & validate request body (Zod) ───────────────────
    const raw = await request.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { studentIds, messageType, customMessage, examTitle } = parsed.data;

    // ── 2. Validate env credentials ───────────────────────────────
    const BULK_SMS_API_KEY   = process.env.BULK_SMS_API_KEY?.trim();
    const BULK_SMS_SENDER_ID = process.env.BULK_SMS_SENDER_ID?.trim();

    if (!BULK_SMS_API_KEY) {
      return NextResponse.json({ success: false, error: "BULK_SMS_API_KEY not set in .env" }, { status: 500 });
    }
    if (!BULK_SMS_SENDER_ID || !/^\d+$/.test(BULK_SMS_SENDER_ID)) {
      return NextResponse.json({ success: false, error: "BULK_SMS_SENDER_ID missing or not numeric in .env" }, { status: 500 });
    }

    // ── 3. Fetch students ─────────────────────────────────────────
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id:      true,
        name:    true,
        surname: true,
        class:   { select: { id: true, name: true } },
        grade:   { select: { level: true } },
        parent:  { select: { phone: true, name: true } },
        school: {
          select: {
            id:              true,
            schoolName:      true,
            shortName:       true,
            phone:           true,
            academicSession: true,
            address:         true,
            smsBalance:      true,
          },
        },
        classHistory: {
          where:   { academicYear: { contains: "2025" } },
          orderBy: { promotedAt: "desc" },
          take:    1,
          select:  { rollNumber: true, academicYear: true, class: { select: { name: true } } },
        },
      },
    });

    if (!students.length) {
      return NextResponse.json({ success: false, error: "No matching students found" }, { status: 404 });
    }

    // ── 4. School & balance ───────────────────────────────────────
    const schoolId = students[0]?.school?.id;
    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School not linked to selected students" }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId }, select: { smsBalance: true },
    });
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found" }, { status: 404 });
    }

    // ── 5. Optional exam lookup ───────────────────────────────────
    let examInfo: any = null;
    if (examTitle) {
      examInfo = await prisma.exam.findFirst({
        where: { schoolId, title: { contains: examTitle, mode: "insensitive" } },
        orderBy: { startTime: "desc" },
        select: { id: true, title: true, startTime: true, endTime: true },
      });
    }

    // ── 6. Build unique messages (deduplicate by phone) ───────────
    const phoneMap = new Map<string, BulkMessage>();

    for (const student of students) {
      const rawPhone = student.parent?.phone;
      if (!rawPhone) { console.warn(`No phone: ${student.name} ${student.surname}`); continue; }

      const phone = normaliseBDPhone(rawPhone);
      if (!phone) { console.warn(`Invalid phone "${rawPhone}": ${student.name}`); continue; }

      const text = buildMessage(student, messageType, customMessage, examInfo);

      // Zod validate each individual message
      const msgCheck = MessageSchema.safeParse({ to: phone, message: text });
      if (!msgCheck.success) { console.warn(`Message validation failed for ${phone}`); continue; }

      if (phoneMap.has(phone)) {
        phoneMap.get(phone)!.message += `\n\nAlso: ${student.name} ${student.surname} (${student.class?.name ?? "N/A"})`;
      } else {
        phoneMap.set(phone, { to: phone, message: text });
      }
    }

    const messages = Array.from(phoneMap.values());

    if (!messages.length) {
      return NextResponse.json(
        { success: false, error: "No valid parent phone numbers found", details: "Parents must have valid BD mobile numbers (017XXXXXXXX)" },
        { status: 400 }
      );
    }

    // ── 7. Balance check ──────────────────────────────────────────
    const smsNeeded = messages.length;
    if (school.smsBalance < smsNeeded) {
      return NextResponse.json(
        { success: false, error: "Insufficient SMS balance", details: `Need ${smsNeeded}, have ${school.smsBalance}.`, balanceRequired: smsNeeded, balanceAvailable: school.smsBalance },
        { status: 402 }
      );
    }

    // ── 8. Build & validate the EXACT BulkSMS BD POST payload ─────
    //
    //  POST http://bulksmsbd.net/api/smsapimany
    //  Body: { api_key, senderid, messages: [{to, message}, …] }
    //
    const bulkPayload = { api_key: BULK_SMS_API_KEY, senderid: BULK_SMS_SENDER_ID, messages };

    const payloadCheck = BulkPayloadSchema.safeParse(bulkPayload);
    if (!payloadCheck.success) {
      console.error("Payload schema error:", payloadCheck.error.flatten());
      return NextResponse.json(
        { success: false, error: "Internal payload validation failed", issues: payloadCheck.error.flatten() },
        { status: 500 }
      );
    }

    // ── 9. Create PENDING log ─────────────────────────────────────
    let smsLogId: number | null = null;
    try {
      const log = await prisma.sMSLog.create({
        data: {
          schoolId,
          messageType,
          receiverNo:     messages[0].to,
          message:        messages[0].message,
          recipientCount: messages.length,
          studentCount:   studentIds.length,
          messageContent: messages[0].message.substring(0, 100),
          status:         "PENDING",
          sentAt:         new Date(),
        },
      });
      smsLogId = log.id;
    } catch (e) { console.error("Log create failed:", e); }

    // ── 10. POST to BulkSMS BD ─────────────────────────────────────
    console.log(`📤 POST http://bulksmsbd.net/api/smsapimany — ${messages.length} messages`);
    console.log("Payload:", JSON.stringify({ ...bulkPayload, api_key: "***hidden***" }, null, 2));

    let apiRes: Response;
    try {
      apiRes = await fetch("http://bulksmsbd.net/api/smsapimany", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept":       "application/json",
        },
        body: JSON.stringify(bulkPayload),  // ← exact BulkSMS BD format
      });
    } catch (netErr) {
      // Network-level failure (DNS, firewall, etc.)
      console.error("Network error:", netErr);
      return NextResponse.json(
        { success: false, error: "Cannot reach BulkSMS BD server. Check server outbound access.", details: String(netErr) },
        { status: 502 }
      );
    }

    const rawText = await apiRes.text();
    console.log("📥 BulkSMS BD response:", rawText);

    let result: Record<string, any> = {};
    try { result = JSON.parse(rawText); }
    catch { result = { raw: rawText }; }

    // BulkSMS BD success: response_code 202
    // Docs: https://bulksmsbd.net/api
    const isSuccess =
      result?.response_code === 202      ||
      result?.response_code === "202"    ||
      String(rawText).includes("202")    ||
      String(rawText).includes("1686");   // legacy success token

    // ── 11. Deduct balance & update log ───────────────────────────
    let balanceAfter = school.smsBalance;
    if (isSuccess) {
      try {
        const updated = await prisma.school.update({
          where:  { id: schoolId },
          data:   { smsBalance: { decrement: smsNeeded } },
          select: { smsBalance: true },
        });
        balanceAfter = updated.smsBalance;
      } catch (e) { console.error("Balance deduction failed:", e); }
    }

    if (smsLogId) {
      try {
        await prisma.sMSLog.update({
          where: { id: smsLogId },
          data:  { status: isSuccess ? "SENT" : "FAILED" },
        });
      } catch (e) { console.error("Log update failed:", e); }
    }

    // ── 12. Response ──────────────────────────────────────────────
    if (!isSuccess) {
      return NextResponse.json(
        {
          success:  false,
          error:    result?.error_message || result?.message || "BulkSMS BD rejected the request",
          details:  result,
          hint:     "Verify BULK_SMS_API_KEY and BULK_SMS_SENDER_ID exactly match your BulkSMS BD dashboard",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success:            true,
      message:            `SMS sent to ${messages.length} parent(s)`,
      sent:               messages.length,
      totalSelected:      studentIds.length,
      withoutParentPhone: studentIds.length - messages.length,
      messageType,
      balanceUsed:        smsNeeded,
      balanceRemaining:   balanceAfter,
      timestamp:          new Date().toISOString(),
      apiResponse:        result,
    });

  } catch (err) {
    console.error("Unhandled /api/send-sms error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}