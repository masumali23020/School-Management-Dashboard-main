// Actions/ParentActions/parentActions.ts
"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import prisma from "@/lib/db";
import { parentSchema, type ParentSchema } from "@/lib/FormValidationSchema";
import { requireSession } from "@/lib/get-session";

type ActionState = { success: boolean; error: boolean; message?: string };

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createParent = async (
  _state: ActionState,
  data: ParentSchema
): Promise<ActionState> => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    // Server-side re-validate
    const parsed = parentSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[createParent] Zod errors:", parsed.error.flatten());
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

    // Check if username already exists in this school
    const existingUser = await prisma.parent.findFirst({
      where: { 
        username: d.username,
        schoolId: schoolId,
      },
    });
    
    if (existingUser) {
      return { success: false, error: true, message: "Username already taken in your school." };
    }

    // Check if phone already exists in this school
    const existingPhone = await prisma.parent.findFirst({
      where: { 
        phone: d.phone,
        schoolId: schoolId,
      },
    });
    
    if (existingPhone) {
      return { 
        success: false, 
        error: true, 
        message: `Phone number ${d.phone} is already registered with another parent in your school.` 
      };
    }

    // Check if email already exists in this school (if provided)
    if (d.email) {
      const existingEmail = await prisma.parent.findFirst({
        where: { 
          email: d.email,
          schoolId: schoolId,
        },
      });
      
      if (existingEmail) {
        return { 
          success: false, 
          error: true, 
          message: `Email ${d.email} is already in use by another parent in your school.` 
        };
      }
    }

    const hashedPassword = await bcrypt.hash(d.password, 12);

    // Create parent
    const parent = await prisma.parent.create({
      data: {
        id: `parent_${nanoid(12)}`,
        schoolId: schoolId,
        username: d.username,
        password: hashedPassword,
        name: d.name,
        surname: d.surname,
        email: d.email || null,
        phone: d.phone,
        address: d.address,
      },
    });

    // Update all selected students with this parentId
    if (d.studentIds && d.studentIds.length > 0) {
      // Verify students belong to the same school
      const students = await prisma.student.findMany({
        where: {
          id: { in: d.studentIds },
          schoolId: schoolId,
        },
        select: { id: true }
      });

      if (students.length !== d.studentIds.length) {
        return { 
          success: false, 
          error: true, 
          message: "Some students do not belong to your school." 
        };
      }

      await prisma.student.updateMany({
        where: {
          id: { in: d.studentIds },
        },
        data: {
          parentId: parent.id,
        },
      });
    }

    return { success: true, error: false, message: "Parent created successfully" };
  } catch (err: unknown) {
    console.error("[createParent]", err);
    if (isPrismaUniqueError(err)) {
      return { success: false, error: true, message: uniqueMessage(err) };
    }
    return { success: false, error: true, message: "Failed to create parent." };
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateParent = async (
  _state: ActionState,
  data: ParentSchema
): Promise<ActionState> => {
  if (!data.id) {
    return { success: false, error: true, message: "Parent ID is required." };
  }

  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    const parsed = parentSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[updateParent] Zod errors:", parsed.error.flatten());
      return {
        success: false,
        error: true,
        message: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(", "),
      };
    }

    const d = parsed.data;

    // Check if parent exists and belongs to the school
    const existingParent = await prisma.parent.findFirst({
      where: {
        id: d.id,
        schoolId: schoolId,
      },
    });

    if (!existingParent) {
      return { 
        success: false, 
        error: true, 
        message: "Parent not found or does not belong to your school." 
      };
    }

    // Check if username already exists (excluding current)
    const existingUser = await prisma.parent.findFirst({
      where: { 
        username: d.username,
        schoolId: schoolId,
        NOT: { id: d.id }
      },
    });
    
    if (existingUser) {
      return { success: false, error: true, message: "Username already taken by another parent in your school." };
    }

    // Check if phone already exists (excluding current)
    const existingPhone = await prisma.parent.findFirst({
      where: { 
        phone: d.phone,
        schoolId: schoolId,
        NOT: { id: d.id }
      },
    });
    
    if (existingPhone) {
      return { 
        success: false, 
        error: true, 
        message: `Phone number ${d.phone} is already in use by another parent in your school.` 
      };
    }

    // Check if email already exists (excluding current)
    if (d.email) {
      const existingEmail = await prisma.parent.findFirst({
        where: { 
          email: d.email,
          schoolId: schoolId,
          NOT: { id: d.id }
        },
      });
      
      if (existingEmail) {
        return { 
          success: false, 
          error: true, 
          message: `Email ${d.email} is already in use by another parent in your school.` 
        };
      }
    }

    // Prepare update data
    const updateData: any = {
      username: d.username,
      name: d.name,
      surname: d.surname,
      email: d.email || null,
      phone: d.phone,
      address: d.address,
    };

    // Only update password if provided
    if (d.password && d.password.trim() !== "") {
      updateData.password = await bcrypt.hash(d.password, 12);
    }

    // Update parent info
    await prisma.parent.update({
      where: { id: d.id },
      data: updateData,
    });

    // First remove parentId from all students that were previously connected
    await prisma.student.updateMany({
      where: {
        parentId: d.id,
      },
      data: {
        parentId: null,
      },
    });

    // Then update only the selected students with this parentId
    if (d.studentIds && d.studentIds.length > 0) {
      // Verify students belong to the same school
      const students = await prisma.student.findMany({
        where: {
          id: { in: d.studentIds },
          schoolId: schoolId,
        },
        select: { id: true }
      });

      if (students.length !== d.studentIds.length) {
        return { 
          success: false, 
          error: true, 
          message: "Some students do not belong to your school." 
        };
      }

      await prisma.student.updateMany({
        where: {
          id: { in: d.studentIds },
        },
        data: {
          parentId: d.id,
        },
      });
    }

    return { success: true, error: false, message: "Parent updated successfully" };
  } catch (err: unknown) {
    console.error("[updateParent]", err);
    if (isPrismaUniqueError(err)) {
      return { success: false, error: true, message: uniqueMessage(err) };
    }
    return { success: false, error: true, message: "Failed to update parent." };
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteParent = async (
  _state: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const id = formData.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Parent ID is required." };
  }
  
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    // Check if parent exists and belongs to the school
    const parent = await prisma.parent.findFirst({
      where: {
        id: id,
        schoolId: schoolId,
      },
      include: {
        students: true,
      },
    });

    if (!parent) {
      return { 
        success: false, 
        error: true, 
        message: "Parent not found or does not belong to your school." 
      };
    }

    // First remove parentId from all students
    if (parent.students.length > 0) {
      await prisma.student.updateMany({
        where: {
          parentId: id,
        },
        data: {
          parentId: null,
        },
      });
    }

    // Delete parent from DB
    await prisma.parent.delete({
      where: { id: id },
    });

    return { success: true, error: false, message: "Parent deleted successfully" };
  } catch (err) {
    console.error("[deleteParent]", err);
    return { success: false, error: true, message: "Failed to delete parent." };
  }
};

// ─── GET PARENTS ─────────────────────────────────────────────────────────────
export const getAllParents = async () => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER"]);
    const { schoolId } = session;

    const parents = await prisma.parent.findMany({
      where: {
        schoolId: schoolId,
      },
      include: {
        students: {
          include: {
            class: true,
            grade: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    
    return parents;
  } catch (err) {
    console.error("[getAllParents]", err);
    return [];
  }
};

export const getParentById = async (id: string) => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER", "PARENT"]);
    const { schoolId } = session;

    const parent = await prisma.parent.findFirst({
      where: {
        id: id,
        schoolId: schoolId,
      },
      include: {
        students: {
          include: {
            class: true,
            grade: true,
            attendances: true,
            results: {
              include: {
                exam: true,
                subject: true,
              },
            },
          },
        },
      },
    });
    
    return parent;
  } catch (err) {
    console.error("[getParentById]", err);
    return null;
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