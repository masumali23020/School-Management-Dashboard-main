// Actions/GradeActions/GradeActions.ts
"use server";

import prisma from "@/lib/db";
import { gradeSchema, type GradeSchema } from "@/lib/FormValidationSchema";
import { requireSession } from "@/lib/get-session";

type ActionState = { success: boolean; error: boolean; message?: string };

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createGrade = async (
  _state: ActionState,
  data: GradeSchema
): Promise<ActionState> => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    console.log("[createGrade] School ID from session:", schoolId);

    if (!schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "School ID not found in session. Please log in again." 
      };
    }

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      console.error("[createGrade] School not found:", schoolId);
      return { 
        success: false, 
        error: true, 
        message: "School not found. Please contact administrator." 
      };
    }

    // Server-side re-validate
    const parsed = gradeSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[createGrade] Zod errors:", parsed.error.flatten());
      return {
        success: false,
        error: true,
        message: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(", "),
      };
    }

    const d = parsed.data;

    // Check if grade level already exists in this school
    const existingGrade = await prisma.grade.findFirst({
      where: { 
        level: d.level,
        schoolId: schoolId,
      },
    });
    
    if (existingGrade) {
      return { 
        success: false, 
        error: true, 
        message: `Grade level "${d.level}" already exists in this school.` 
      };
    }

    // Create grade with schoolId
    const newGrade = await prisma.grade.create({
      data: {
        schoolId: schoolId,
        level: d.level,
      },
    });

    console.log("[createGrade] Grade created successfully:", newGrade);

    return { 
      success: true, 
      error: false, 
      message: "Grade created successfully" 
    };
  } catch (err: unknown) {
    console.error("[createGrade] Error details:", err);
    
    if (isPrismaUniqueError(err)) {
      return { 
        success: false, 
        error: true, 
        message: "Grade level already exists." 
      };
    }
    
    if (isForeignKeyError(err)) {
      return { 
        success: false, 
        error: true, 
        message: "Invalid school configuration. Please contact administrator." 
      };
    }
    
    return { 
      success: false, 
      error: true, 
      message: "Failed to create grade. Please try again." 
    };
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateGrade = async (
  _state: ActionState,
  data: GradeSchema
): Promise<ActionState> => {
  if (!data.id) {
    return { success: false, error: true, message: "Grade ID is required." };
  }

  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    if (!schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "School ID not found in session. Please log in again." 
      };
    }

    const parsed = gradeSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[updateGrade] Zod errors:", parsed.error.flatten());
      return {
        success: false,
        error: true,
        message: Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .join(", "),
      };
    }

    const d = parsed.data;

    // Check if grade exists and belongs to the school
    const existingGrade = await prisma.grade.findFirst({
      where: {
        id: d.id,
        schoolId: schoolId,
      },
    });

    if (!existingGrade) {
      return { 
        success: false, 
        error: true, 
        message: "Grade not found or does not belong to your school." 
      };
    }

    // Check if another grade with same level exists (excluding current)
    const duplicateGrade = await prisma.grade.findFirst({
      where: {
        level: d.level,
        schoolId: schoolId,
        NOT: { id: d.id }
      },
    });

    if (duplicateGrade) {
      return { 
        success: false, 
        error: true, 
        message: `Another grade with level "${d.level}" already exists.` 
      };
    }

    await prisma.grade.update({
      where: { id: d.id },
      data: {
        level: d.level,
      },
    });

    return { 
      success: true, 
      error: false, 
      message: "Grade updated successfully" 
    };
  } catch (err: unknown) {
    console.error("[updateGrade]", err);
    if (isPrismaUniqueError(err)) {
      return { 
        success: false, 
        error: true, 
        message: "Grade level already exists." 
      };
    }
    return { 
      success: false, 
      error: true, 
      message: "Failed to update grade." 
    };
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteGrade = async (
  _state: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const id = formData.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Grade ID is required." };
  }
  
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    if (!schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "School ID not found in session. Please log in again." 
      };
    }

    // Check if grade exists and belongs to the school
    const grade = await prisma.grade.findFirst({
      where: {
        id: parseInt(id),
        schoolId: schoolId,
      },
      include: {
        students: true,
        classes: true,
      },
    });

    if (!grade) {
      return { 
        success: false, 
        error: true, 
        message: "Grade not found or does not belong to your school." 
      };
    }

    // Check if grade has any associated data
    if (grade.students.length > 0) {
      return { 
        success: false, 
        error: true, 
        message: `Cannot delete grade. It has ${grade.students.length} student(s) assigned. Please reassign or delete the students first.` 
      };
    }

 

    await prisma.grade.delete({
      where: { id: parseInt(id) },
    });

    return { 
      success: true, 
      error: false, 
      message: "Grade deleted successfully" 
    };
  } catch (err) {
    console.error("[deleteGrade]", err);
    return { 
      success: false, 
      error: true, 
      message: "Failed to delete grade." 
    };
  }
};

// ─── GET GRADES ─────────────────────────────────────────────────────────────
export const getAllGrades = async () => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER"]);
    const { schoolId } = session;

    if (!schoolId) {
      console.error("[getAllGrades] No schoolId in session");
      return [];
    }

    const grades = await prisma.grade.findMany({
      where: {
        schoolId: schoolId,
      },
      include: {
        classes: {
          include: {
            students: true,
          },
        },
        students: true,
      },
      orderBy: {
        level: "asc",
      },
    });
    
    return grades;
  } catch (err) {
    console.error("[getAllGrades]", err);
    return [];
  }
};

export const getGradeById = async (id: number) => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER"]);
    const { schoolId } = session;

    if (!schoolId) {
      return null;
    }

    const grade = await prisma.grade.findFirst({
      where: {
        id: id,
        schoolId: schoolId,
      },
      include: {
        classes: true,
        students: true,
      },
    });
    return grade;
  } catch (err) {
    console.error("[getGradeById]", err);
    return null;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPrismaUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    "code" in err && (err as { code: string }).code === "P2002";
}

function isForeignKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    "code" in err && (err as { code: string }).code === "P2003";
}