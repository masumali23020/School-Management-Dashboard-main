// src/lib/actions/mealPayment.actions.ts
"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { getUserRoleAuth } from "@/lib/logsessition";
import { z } from "zod";
import { MealPaymentInvoiceData, RecordPaymentInput, RecordPaymentSchema, UnpaidMealSummary,  } from "./meal-types";
import { ActionResult } from "./meal.actions";

// ─── Types ────────────────────────────────────────────────────────────────────


// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getSchoolId(): Promise<number | null> {
  const { schoolId } = await getUserRoleAuth();
  return schoolId ?? null;
}

// ─── Calculate what a student owes for a given month ─────────────────────────

export async function getStudentUnpaidSummary(params: {
  studentId: string;
  month: number;   // 1-based
  year: number;
}): Promise<ActionResult<UnpaidMealSummary>> {
  try {
    const schoolId = await getSchoolId();
    if (!schoolId) return { success: false, error: "Unauthorized" };

    const { studentId, month, year } = params;

    // Validate
    if (month < 1 || month > 12) return { success: false, error: "Invalid month" };

    const monthLabel = `${new Date(year, month - 1).toLocaleString("en-US", { month: "long" })} ${year}`;
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    // 1. Student info (includes advance + discount)
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        name: true,
        surname: true,
        advance: true,
        discount: true,
        class: { select: { name: true } },
      },
    });
    if (!student) return { success: false, error: "Student not found" };

    // 2. All CONSUMED meal attendance for this month
    const attendances = await prisma.mealAttendance.findMany({
      where: {
        studentId,
        schoolId,
        status: "CONSUMED",
        date: { gte: start, lt: end },
      },
      include: { mealType: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    // 3. All payments already recorded for this month
    const payments = await prisma.mealPayment.findMany({
      where: { studentId, schoolId, monthLabel },
      select: { amount: true },
    });

    const totalConsumed = attendances.reduce(
      (sum, a) => sum + Number(a.appliedRate) * a.quantity,
      0
    );
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Advance covers the bill first, then discount applied
    const advance  = Number(student.advance);
    const discount = Number(student.discount);

    // Remaining after what has already been paid
    const remainingAfterPayments = Math.max(0, totalConsumed - totalPaid);
    // Advance deduction (only up to what is remaining)
    const advanceUsed = Math.min(advance, remainingAfterPayments);
    // Discount on the gross bill
    const discountAmount = (remainingAfterPayments - advanceUsed) * (discount / 100);
    // Net due NOW
    const netDue = Math.max(0, remainingAfterPayments - advanceUsed - discountAmount);

    // Breakdown by meal type
    const breakdownMap = new Map<string, { count: number; rate: number; total: number }>();
    for (const a of attendances) {
      const key = a.mealType.name;
      const entry = breakdownMap.get(key) ?? { count: 0, rate: Number(a.appliedRate), total: 0 };
      entry.count  += a.quantity;
      entry.total  += Number(a.appliedRate) * a.quantity;
      breakdownMap.set(key, entry);
    }
    const breakdown = Array.from(breakdownMap.entries()).map(([mealTypeName, v]) => ({
      mealTypeName,
      ...v,
    }));

    // Unpaid logs — attendances not yet covered by payments
    // We show all consumed meals since the system tracks totals not per-record payments
    const unpaidLogs = attendances.map((a) => ({
      id: a.id,
      date: a.date.toISOString().split("T")[0],
      mealTypeName: a.mealType.name,
      appliedRate: Number(a.appliedRate),
      quantity: a.quantity,
      lineTotal: Number(a.appliedRate) * a.quantity,
    }));

    return {
      success: true,
      data: {
        studentId,
        studentName: student.name,
        studentSurname: student.surname,
        advance,
        discount,
        totalConsumed,
        totalPaid,
        advanceUsed,
        netDue,
        breakdown,
        unpaidLogs,
        monthLabel,
      },
    };
  } catch (err) {
    console.error("[getStudentUnpaidSummary]", err);
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

// ─── Record payment and return invoice data ───────────────────────────────────





export async function recordMealPaymentAndGetInvoice(
  input: RecordPaymentInput
): Promise<ActionResult<MealPaymentInvoiceData>> {
  try {
    const schoolId = await getSchoolId();
    if (!schoolId) return { success: false, error: "Unauthorized" };

    const parsed = RecordPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" };
    }

    const { studentId, month, year, amountCollected, paymentMethod, remarks } = parsed.data;

    const monthLabel = `${new Date(year, month - 1).toLocaleString("en-US", { month: "long" })} ${year}`;
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    // Fetch student + school info for invoice
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        name: true,
        surname: true,
        advance: true,
        discount: true,
        class: { select: { name: true } },
        school: { select: { schoolName: true, address: true, phone: true } },
      },
    });
    if (!student) return { success: false, error: "Student not found" };

    // All consumed meals this month
    const attendances = await prisma.mealAttendance.findMany({
      where: { studentId, schoolId },
      include: { mealType: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    // Already paid
    const existingPayments = await prisma.mealPayment.findMany({
      where: { studentId, schoolId, monthLabel },
      select: { amount: true },
    });
    const alreadyPaid = existingPayments.reduce((s, p) => s + Number(p.amount), 0);

    const grossTotal   = attendances.reduce((s, a) => s + Number(a.appliedRate) * a.quantity, 0);
    const advance      = Number(student.advance);
    const discount     = Number(student.discount);
    const remaining    = Math.max(0, grossTotal - alreadyPaid);
    const advanceUsed  = Math.min(advance, remaining);
    const discountAmt  = (remaining - advanceUsed) * (discount / 100);
    const netDue       = Math.max(0, remaining - advanceUsed - discountAmt);

    // Record the payment
    const payment = await prisma.mealPayment.create({
      data: {
        schoolId,
        studentId,
        amount: new Decimal(amountCollected),
        paymentMethod,
        monthLabel,
        remarks,
      },
      select: { id: true },
    });

    // If advance was used, reduce Student.advance in DB
    if (advanceUsed > 0) {
      await prisma.student.update({
        where: { id: studentId },
        data: { advance: { decrement: advanceUsed } },
      });
    }

    // Breakdown by meal type for invoice
    const breakdownMap = new Map<string, { count: number; rate: number; total: number }>();
    for (const a of attendances) {
      const key = a.mealType.name;
      const entry = breakdownMap.get(key) ?? { count: 0, rate: Number(a.appliedRate), total: 0 };
      entry.count += a.quantity;
      entry.total += Number(a.appliedRate) * a.quantity;
      breakdownMap.set(key, entry);
    }

    const remainingBalance = Math.max(0, netDue - amountCollected);

    revalidatePath("/list/meals");

    return {
      success: true,
      data: {
        invoiceId:       payment.id,
        invoiceDate:     new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        schoolName:      student.school.schoolName,
        schoolAddress:   student.school.address ?? "",
        schoolPhone:     student.school.phone ?? "",
        studentName:     `${student.name} ${student.surname}`,
        studentId,
        className:       student.class?.name ?? "",
        monthLabel,
        breakdown:       Array.from(breakdownMap.entries()).map(([mealTypeName, v]) => ({ mealTypeName, ...v })),
        grossTotal,
        advanceDeducted: advanceUsed,
        discountAmount:  discountAmt,
        amountPaid:      amountCollected,
        remainingBalance,
        paymentMethod,
      },
    };
  } catch (err) {
    console.error("[recordMealPaymentAndGetInvoice]", err);
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}