"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { PlanType } from "@prisma/client";
import { getSuperAdminSession } from "./superadmin-login.action";

type ActionResult = { success: true; message: string } | { success: false; message: string };

type PlanInput = {
  id?: number;
  name: PlanType;
  price: number;
  maxStudents: number;
  maxEmployees: number;
  hasSMS: boolean;
  hasAnalytics: boolean;
};

async function guard() {
  const session = await getSuperAdminSession();
  if (!session) return { success: false, message: "Unauthorized access." } as const;
  return null;
}

export async function createSubscriptionPlanBySuperAdmin(input: PlanInput): Promise<ActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  try {
    const exists = await prisma.subscriptionPlan.findUnique({ where: { name: input.name } });
    if (exists) {
      return { success: false, message: `${input.name} plan already exists.` };
    }

    await prisma.subscriptionPlan.create({
      data: {
        name: input.name,
        price: input.price,
        maxStudents: input.maxStudents,
        maxEmployees: input.maxEmployees,
        hasSMS: input.hasSMS,
        hasAnalytics: input.hasAnalytics,
      },
    });

    revalidatePath("/superadmin/plans");
    revalidatePath("/superadmin/dashboard");
    return { success: true, message: "Subscription plan created." };
  } catch (error) {
    console.error("[createSubscriptionPlanBySuperAdmin]", error);
    return { success: false, message: "Failed to create subscription plan." };
  }
}

export async function updateSubscriptionPlanBySuperAdmin(input: PlanInput): Promise<ActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  if (!input.id) {
    return { success: false, message: "Plan ID is required." };
  }

  try {
    const target = await prisma.subscriptionPlan.findUnique({ where: { id: input.id } });
    if (!target) return { success: false, message: "Plan not found." };

    await prisma.subscriptionPlan.update({
      where: { id: input.id },
      data: {
        price: input.price,
        maxStudents: input.maxStudents,
        maxEmployees: input.maxEmployees,
        hasSMS: input.hasSMS,
        hasAnalytics: input.hasAnalytics,
      },
    });

    revalidatePath("/superadmin/plans");
    revalidatePath("/superadmin/dashboard");
    return { success: true, message: "Subscription plan updated." };
  } catch (error) {
    console.error("[updateSubscriptionPlanBySuperAdmin]", error);
    return { success: false, message: "Failed to update subscription plan." };
  }
}

export async function deleteSubscriptionPlanBySuperAdmin(planId: number): Promise<ActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  try {
    const usedBy = await prisma.school.count({ where: { planId } });
    if (usedBy > 0) {
      return { success: false, message: `Cannot delete. ${usedBy} school(s) are using this plan.` };
    }

    await prisma.subscriptionPlan.delete({ where: { id: planId } });
    revalidatePath("/superadmin/plans");
    revalidatePath("/superadmin/dashboard");
    return { success: true, message: "Subscription plan deleted." };
  } catch (error) {
    console.error("[deleteSubscriptionPlanBySuperAdmin]", error);
    return { success: false, message: "Failed to delete subscription plan." };
  }
}
