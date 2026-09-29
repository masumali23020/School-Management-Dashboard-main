// src/lib/meal-types.ts
import { z } from "zod";
import { PaymentMethod } from "@prisma/client";


export interface UnpaidMealSummary {
  studentId: string;
  studentName: string;
  studentSurname: string;
  advance: number;
  discount: number;
  totalConsumed: number;
  totalPaid: number;
  advanceUsed: number;
  netDue: number;
  breakdown: {
    mealTypeName: string;
    count: number;
    rate: number;
    total: number;
  }[];
  unpaidLogs: {
    id: number;
    date: string;
    mealTypeName: string;
    appliedRate: number;
    quantity: number;
    lineTotal: number;
  }[];
  monthLabel: string;
}

// MealPaymentInvoiceData ও ActionResult এখানে যোগ করুন...


// src/lib/actions/meal-types.ts (বা যেখানে আপনি টাইপগুলো রাখছেন)



export interface MealBreakdownItem {
  mealTypeName: string;
  count: number;
  rate: number;
  total: number;
}

export interface MealPaymentInvoiceData {
  invoiceId: number;
  invoiceDate: string;      // Format: "Month Day, Year" (অ্যাকশন থেকে আসছে)
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  studentName: string;
  studentId: string;
  className: string;
  monthLabel: string;       // যেমন: "May 2026"
  breakdown: MealBreakdownItem[];
  grossTotal: number;
  advanceDeducted: number;
  discountAmount: number;
  amountPaid: number;       // এটি আপনার 'amountCollected'
  remainingBalance: number;
  paymentMethod: PaymentMethod;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface UnpaidMealSummary {
  studentId: string;
  studentName: string;
  studentSurname: string;
  advance: number;            // Student.advance balance
  discount: number;           // Student.discount
  totalConsumed: number;      // sum of all CONSUMED meal costs
  totalPaid: number;          // sum of all MealPayment amounts
  advanceUsed: number;        // how much of advance covers the bill
  netDue: number;             // what the student must actually pay NOW
  breakdown: {
    mealTypeName: string;
    count: number;
    rate: number;
    total: number;
  }[];
  unpaidLogs: {
    id: number;
    date: string;
    mealTypeName: string;
    appliedRate: number;
    quantity: number;
    lineTotal: number;
  }[];
  monthLabel: string;
}

export interface MealPaymentInvoiceData {
  invoiceId: number;
  invoiceDate: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  studentName: string;
  studentId: string;
  className: string;
  monthLabel: string;
  breakdown: {
    mealTypeName: string;
    count: number;
    rate: number;
    total: number;
  }[];
  grossTotal: number;
  advanceDeducted: number;
  discountAmount: number;
  amountPaid: number;         // what was actually collected this time
  remainingBalance: number;   // any leftover
  paymentMethod: PaymentMethod;
}
export const RecordPaymentSchema = z.object({
  studentId:     z.string().min(1),
  month:         z.number().int().min(1).max(12),
  year:          z.number().int().min(2020),
  amountCollected: z.number(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_BANKING", ]),
  remarks:       z.string().max(500).optional(),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;