"use server";

import prisma from "../../lib/db";
import { CashierSchema } from "../../lib/FormValidationSchema";
import { UserRole } from "@prisma/client";
import { getUserRoleAuth } from "@/lib/logsessition";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

type CreateState = { 
  success: boolean; 
  error: boolean; 
  message?: string 
};

/**
 * ১. ক্যাশিয়ার তৈরি করা
 */
export const createCashier = async (
  prevState: CreateState,
  data: CashierSchema
) => {
  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    await prisma.employee.create({
      data: {
        // আইডি জেনারেট করা (Prefix: emp_cash_)
        id: `emp_cash_${nanoid(10)}`,
        schoolId: Number(schoolId),
        username: data.username,
        password: data.password, // মনে রাখবেন: প্রোডাকশনে পাসওয়ার্ড হাশ (Hash) করা উচিত
        role: UserRole.CASHIER,
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

    revalidatePath("/list/cashiers");
    return { success: true, error: false };
  } catch (err) {
    console.error("Create Cashier Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ২. ক্যাশিয়ার আপডেট করা
 */
export const updateCashier = async (
  prevState: CreateState,
  data: CashierSchema
) => {
  if (!data.id) return { success: false, error: true, message: "ID missing" };

  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true };
    }

    await prisma.employee.update({
      where: { 
        id: data.id,
        schoolId: Number(schoolId) // নিশ্চিত করা যে সে এই স্কুলেরই কর্মচারী
      },
      data: {
        username: data.username,
        ...(data.password && { password: data.password }), // যদি নতুন পাসওয়ার্ড দেয়
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

    revalidatePath("/list/cashiers");
    return { success: true, error: false };
  } catch (err) {
    console.error("Update Cashier Error:", err);
    return { success: false, error: true };
  }
};

/**
 * ৩. ক্যাশিয়ার ডিলিট করা
 */
export const deleteCashier = async (
  prevState: CreateState,
  formData: FormData
) => {
  const id = formData.get("id") as string;

  if (!id) return { success: false, error: true };

  try {
    const { schoolId } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true };
    }

    await prisma.employee.delete({
      where: { 
        id: id,
        schoolId: Number(schoolId) // সিকিউরিটি চেক
      },
    });

    revalidatePath("/list/cashiers");
    return { success: true, error: false };
  } catch (err) {
    console.error("Delete Cashier Error:", err);
    return { success: false, error: true };
  }
};