"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { PaymentMethod } from "@prisma/client";
import { getSuperAdminSession } from "./superadmin-login.action";

type ActionResult = { success: true; message: string } | { success: false; message: string };

type RecordPaymentInput = {
  schoolId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  invoiceNo?: string;
  note?: string;
  extendDays: number;
};

async function guard() {
  const session = await getSuperAdminSession();
  if (!session) return { success: false, message: "Unauthorized access." } as const;
  return null;
}

export async function recordSubscriptionPaymentBySuperAdmin(input: RecordPaymentInput): Promise<ActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  if (input.amount <= 0 || input.extendDays <= 0) {
    return { success: false, message: "Amount and extend days must be greater than 0." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const school = await tx.school.findUnique({ where: { id: input.schoolId } });
      if (!school) {
        throw new Error("School not found.");
      }

      const baseDate = school.expiredAt && school.expiredAt > new Date() ? school.expiredAt : new Date();
      const nextExpiredAt = new Date(baseDate);
      nextExpiredAt.setDate(nextExpiredAt.getDate() + input.extendDays);

      await tx.subscriptionPayment.create({
        data: {
          schoolId: input.schoolId,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          status: "PAID",
          transactionId: input.transactionId || null,
          invoiceNo: input.invoiceNo || null,
          note: input.note || null,
          paidAt: new Date(),
        },
      });

      await tx.school.update({
        where: { id: input.schoolId },
        data: { expiredAt: nextExpiredAt, isActive: true },
      });
    });

    revalidatePath("/superadmin/payments");
    revalidatePath("/superadmin/dashboard");
    revalidatePath("/superadmin/schools");
    return { success: true, message: "Payment recorded and school subscription renewed." };
  } catch (error) {
    console.error("[recordSubscriptionPaymentBySuperAdmin]", error);
    return { success: false, message: "Failed to record payment." };
  }
}
