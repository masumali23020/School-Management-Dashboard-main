
// actions/TeacherActions/teacherActions.ts
"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import  prisma  from "@/lib/db";
import { cashierSchema, CashierSchema, staffSchema, StaffSchema, } from "@/lib/FormValidationSchema";
import { requireSession } from "@/lib/get-session";

type ActionState = { success: boolean; error: boolean; message?: string };

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createCashier = async (
  _state: ActionState,
  data: CashierSchema
): Promise<ActionState> => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    // Server-side re-validate
    const parsed = cashierSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[createCashier] Zod errors:", parsed.error.flatten());
      return {
        success: false,
        error: true,
        message: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(", "),
      };
    }

    const d = parsed.data;

    if (!d.password) {
      return { success: false, error: true, message: "Password is required." };
    }

    const existing = await prisma.employee.findFirst({
      where: { username: d.username },
    });
    if (existing) {
      return { success: false, error: true, message: "Username already taken." };
    }

    const hashedPassword = await bcrypt.hash(d.password, 12);

    await prisma.employee.create({
      data: {
        id:        `emp_${nanoid(12)}`,
        schoolId: Number(schoolId),
        username:  d.username,
        password:  hashedPassword,
        role:      "CASHIER",
        name:      d.name,
        surname:   d.surname,
        email:     d.email     || null,
        phone:     d.phone     || null,
        address:   d.address,
        img:       d.img       || null,
        bloodType: d.bloodType,
        sex:       d.sex,
        birthday:  new Date(d.birthday),   // ★ string → Date এখানে
   

      },
    });

    return { success: true, error: false };
  } catch (err: unknown) {
    console.error("[createCashier]", err);
    if (isPrismaUniqueError(err)) {
      return { success: false, error: true, message: uniqueMessage(err) };
    }
    return { success: false, error: true, message: "Failed to create cashier." };
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateCashier = async (
  _state: ActionState,
  data: CashierSchema
): Promise<ActionState> => {
  if (!data.id) return { success: false, error: true, message: "Missing ID." };

  try {
    const parsed = cashierSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[updateCashier] Zod errors:", parsed.error.flatten());
      return {
        success: false,
        error: true,
        message: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(", "),
      };
    }

    const d = parsed.data;

    await prisma.employee.update({
      where: { id: data.id },
      data: {
        username:  d.username,
        ...(d.password && d.password.trim() !== "" && {
          password: await bcrypt.hash(d.password, 12),
        }),
        name:      d.name,
        surname:   d.surname,
        email:     d.email     || null,
        phone:     d.phone     || null,
        address:   d.address,
        img:       d.img       || null,
        bloodType: d.bloodType,
        sex:       d.sex,
        birthday:  new Date(d.birthday), 
        role:      "CASHIER",  // ★ string → Date এখানে
      
      },
    });

    return { success: true, error: false };
  } catch (err: unknown) {
    console.error("[updateStaff]", err);
    if (isPrismaUniqueError(err)) {
      return { success: false, error: true, message: uniqueMessage(err) };
    }
    return { success: false, error: true, message: "Failed to update staff." };
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deletCashier = async (
  _state: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const id = formData.get("id") as string;
  if (!id) return { success: false, error: true, message: "Missing ID." };
  try {
    await prisma.employee.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteCashier]", err);
    return { success: false, error: true, message: "Failed to delete staff." };
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPrismaUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    "code" in err && (err as { code: string }).code === "P2002";
}

function uniqueMessage(err: unknown): string {
  const target = (err as { meta?: { target?: string[] } }).meta?.target?.[0];
  if (target === "username") return "Username already taken.";
  if (target === "email")    return "Email already in use.";
  if (target === "phone")    return "Phone number already in use.";
  return "Duplicate entry detected.";
}