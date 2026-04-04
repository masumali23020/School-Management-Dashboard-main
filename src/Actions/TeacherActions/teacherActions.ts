// actions/TeacherActions/teacherActions.ts
"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import  prisma  from "@/lib/db";
import { teacherSchema, type TeacherSchema } from "@/lib/FormValidationSchema";
import { requireSession } from "@/lib/get-session";

type ActionState = { success: boolean; error: boolean; message?: string };

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createTeacher = async (
  _state: ActionState,
  data: TeacherSchema
): Promise<ActionState> => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    // Server-side re-validate
    const parsed = teacherSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[createTeacher] Zod errors:", parsed.error.flatten());
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
        schoolId,
        username:  d.username,
        password:  hashedPassword,
        role:      "TEACHER",
        name:      d.name,
        surname:   d.surname,
        email:     d.email     || null,
        phone:     d.phone     || null,
        address:   d.address,
        img:       d.img       || null,
        bloodType: d.bloodType,
        sex:       d.sex,
        birthday:  new Date(d.birthday),   // ★ string → Date এখানে
        subjects: {
          connect: d.subjects?.map((id: string) => ({
            id: parseInt(id),
          })) ?? [],
        },
      },
    });

    return { success: true, error: false };
  } catch (err: unknown) {
    console.error("[createTeacher]", err);
    if (isPrismaUniqueError(err)) {
      return { success: false, error: true, message: uniqueMessage(err) };
    }
    return { success: false, error: true, message: "Failed to create teacher." };
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateTeacher = async (
  _state: ActionState,
  data: TeacherSchema
): Promise<ActionState> => {
  if (!data.id) return { success: false, error: true, message: "Missing ID." };

  try {
    const parsed = teacherSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[updateTeacher] Zod errors:", parsed.error.flatten());
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
        birthday:  new Date(d.birthday),   // ★ string → Date এখানে
        subjects: {
          set: d.subjects?.map((id: string) => ({
            id: parseInt(id),
          })) ?? [],
        },
      },
    });

    return { success: true, error: false };
  } catch (err: unknown) {
    console.error("[updateTeacher]", err);
    if (isPrismaUniqueError(err)) {
      return { success: false, error: true, message: uniqueMessage(err) };
    }
    return { success: false, error: true, message: "Failed to update teacher." };
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteTeacher = async (
  _state: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const id = formData.get("id") as string;
  if (!id) return { success: false, error: true, message: "Missing ID." };
  try {
    await prisma.employee.delete({ where: { id } });
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteTeacher]", err);
    return { success: false, error: true, message: "Failed to delete teacher." };
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