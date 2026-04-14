"use server";

import { getUserRoleAuth } from "@/lib/logsessition";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

type UpdateSchoolInput = {
  id: number;
  schoolName: string;
  shortName?: string;
  email?: string;
  phone?: string;
  address?: string;
  establishedYear?: string;
  passRate?: string;
  eiinNumber?: string;
  academicSession: string;
  logoUrl?: string;
  bannerUrl?: string;
};

// ─────────────────────────────────────────────
// UPDATE SCHOOL  ✅ direct call (no useFormState)
// ─────────────────────────────────────────────
export async function updateSchool(data: UpdateSchoolInput) {
  try {
    const { role, schoolId } = await getUserRoleAuth();

    // Security: only admin of this school can update
    if (role !== "admin" || Number(schoolId) !== Number(data.id)) {
      return { success: false, message: "Unauthorized!" };
    }

    // EIIN uniqueness check
    if (data.eiinNumber) {
      const existing = await prisma.school.findFirst({
        where: { eiinNumber: data.eiinNumber, NOT: { id: Number(data.id) } },
      });
      if (existing) {
        return { success: false, message: "This EIIN number is already used by another school." };
      }
    }

    await prisma.school.update({
      where: { id: Number(data.id) },
      data: {
        schoolName: data.schoolName,
        shortName:       data.shortName       || null,
        email:           data.email           || null,
        phone:           data.phone           || null,
        address:         data.address         || null,
        establishedYear: data.establishedYear || null,
        passRate:        data.passRate        || null,
        eiinNumber:      data.eiinNumber      || null,
        academicSession: data.academicSession,
        logoUrl:         data.logoUrl         || null,
        bannerUrl:       data.bannerUrl       || null,
      },
    });

    revalidatePath("/school/profile");
    return { success: true, message: "School updated successfully." };

  } catch (err) {
    console.error("[updateSchool error]", err);
    return { success: false, message: "Database error. Please try again." };
  }
}

// ─────────────────────────────────────────────
// DELETE SCHOOL
// ─────────────────────────────────────────────
export async function deleteSchool(schoolId: number) {
  try {
    const { role, schoolId: sessionSchoolId } = await getUserRoleAuth();

    if (role !== "admin" || Number(sessionSchoolId) !== Number(schoolId)) {
      return { success: false, message: "Unauthorized!" };
    }

    await prisma.school.delete({ where: { id: Number(schoolId) } });

    return { success: true };
  } catch (err) {
    console.error("[deleteSchool error]", err);
    return { success: false, message: "Failed to delete school." };
  }
}