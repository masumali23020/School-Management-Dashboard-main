"use server";

import prisma from "@/lib/db";
import { getSuperAdminSession } from "./superadmin-login.action";
import { revalidatePath } from "next/cache";

type ActionResult = { success: true; message: string } | { success: false; message: string };

type UpdateSchoolBySuperAdminInput = {
  id: number;
  schoolName: string;
  shortName?: string;
  email?: string;
  phone?: string;
  address?: string;
  academicSession: string;
  planId: number;
  smsBalance: number;
  expiredAt?: string;
  isActive: boolean;
};

async function guardSuperAdmin(): Promise<ActionResult | null> {
  const session = await getSuperAdminSession();
  if (!session) {
    return { success: false, message: "Unauthorized access." };
  }
  return null;
}

export async function updateSchoolBySuperAdmin(input: UpdateSchoolBySuperAdminInput): Promise<ActionResult> {
  const blocked = await guardSuperAdmin();
  if (blocked) return blocked;

  try {
    await prisma.school.update({
      where: { id: input.id },
      data: {
        schoolName: input.schoolName,
        shortName: input.shortName || null,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null,
        academicSession: input.academicSession,
        planId: input.planId,
        smsBalance: Number.isNaN(input.smsBalance) ? 0 : input.smsBalance,
        expiredAt: input.expiredAt ? new Date(input.expiredAt) : null,
        isActive: input.isActive,
      },
    });

    revalidatePath("/superadmin/schools");
    revalidatePath("/superadmin/dashboard");
    return { success: true, message: "School updated successfully." };
  } catch (error) {
    console.error("[updateSchoolBySuperAdmin]", error);
    return { success: false, message: "Failed to update school." };
  }
}

export async function toggleSchoolStatusBySuperAdmin(schoolId: number, nextStatus: boolean): Promise<ActionResult> {
  const blocked = await guardSuperAdmin();
  if (blocked) return blocked;

  try {
    await prisma.school.update({
      where: { id: schoolId },
      data: { isActive: nextStatus },
    });

    revalidatePath("/superadmin/schools");
    revalidatePath("/superadmin/dashboard");
    return { success: true, message: nextStatus ? "School activated." : "School suspended." };
  } catch (error) {
    console.error("[toggleSchoolStatusBySuperAdmin]", error);
    return { success: false, message: "Failed to update school status." };
  }
}

export async function deleteSchoolBySuperAdmin(schoolId: number): Promise<ActionResult> {
  const blocked = await guardSuperAdmin();
  if (blocked) return blocked;

  try {
    await prisma.school.delete({ where: { id: schoolId } });
    revalidatePath("/superadmin/schools");
    revalidatePath("/superadmin/dashboard");
    return { success: true, message: "School deleted successfully." };
  } catch (error) {
    console.error("[deleteSchoolBySuperAdmin]", error);
    return { success: false, message: "Failed to delete school. It may have related data restrictions." };
  }
}
