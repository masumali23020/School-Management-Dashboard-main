"use server";

import { clerkClient } from "@clerk/nextjs/server";
import prisma from "../../lib/db";
import { StaffSchema } from "../../lib/FormValidationSchema";
import { UserRole } from "@prisma/client";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

type CreateState = { success: boolean; error: boolean; message?: string };

/**
 * ১. স্টাফ তৈরি করা (Create Staff)
 */
export const createStaff = async (
  prevState: CreateState,
  data: StaffSchema
) => {
  try {
    const { schoolId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { success: false, error: true, message: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    const client = await clerkClient();
    
    // Clerk-এ ইউজার তৈরি করা
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { 
        role: "STAFF",
        schoolId: schoolId 
      }
    });

    // Prisma ডাটাবেজে ডাটা সেভ করা
    await prisma.employee.create({
      data: {
        id: user.id,
        schoolId: Number(schoolId),
        username: data.username,
        role: UserRole.STAFF, 
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
      }
    });

    revalidatePath("/list/staffs");
    return { success: true, error: false };
  } catch (err: any) {
    console.error("Staff Creation Error:", err);
    return { 
      success: false, 
      error: true, 
      message: err.errors?.[0]?.message || "স্টাফ তৈরি করতে সমস্যা হয়েছে।" 
    };
  }
};

/**
 * ২. স্টাফ আপডেট করা (Update Staff)
 */
export const updateStaff = async (
  prevState: CreateState,
  data: StaffSchema
) => {
  if (!data.id) return { success: false, error: true };

  try {
    const { schoolId } = await getUserRoleAuth();
    const client = await clerkClient();

    // Clerk আপডেট
    await client.users.updateUser(data.id, {
      username: data.username,
      ...(data.password && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    // Prisma আপডেট
    await prisma.employee.update({
      where: { 
        id: data.id,
        schoolId: Number(schoolId) 
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
      },
    });

    revalidatePath("/list/staffs");
    return { success: true, error: false };
  } catch (err) {
    console.error("Staff Update Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ৩. স্টাফ ডিলিট করা (Delete Staff)
 */
export const deleteStaff = async (
  prevState: CreateState,
  formData: FormData
) => {
  const id = formData.get("id") as string;
  if (!id) return { success: false, error: true };

  try {
    const { schoolId } = await getUserRoleAuth();
    const client = await clerkClient();

    // Clerk থেকে রিমুভ করা
    await client.users.deleteUser(id);

    // ডাটাবেজ থেকে রিমুভ করা
    await prisma.employee.delete({
      where: { 
        id: id,
        schoolId: Number(schoolId) 
      },
    });

    revalidatePath("/list/staffs");
    return { success: true, error: false };
  } catch (err) {
    console.error("Staff Delete Error:", err);
    return { success: false, error: true };
  }
};