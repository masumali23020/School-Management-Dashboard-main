// Actions/GradeActions/GradeActions.ts
"use server";

import prisma from "@/lib/db";
import { gradeSchema, type GradeSchema } from "@/lib/FormValidationSchema";
import { requireSession } from "@/lib/get-session";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

type ActionState = { success: boolean; error: boolean; message?: string };

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
async function validateSchoolAccess(schoolId: number | undefined): Promise<{ valid: boolean; message?: string }> {
  if (!schoolId || schoolId === 0) {
    return { 
      valid: false, 
      message: "Your account is not associated with any school. Please contact administrator." 
    };
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, isActive: true }
  });

  if (!school) {
    return { 
      valid: false, 
      message: `School not found. Please contact administrator.` 
    };
  }

  if (!school.isActive) {
    return { 
      valid: false, 
      message: "Your school account is inactive. Please contact administrator." 
    };
  }

  return { valid: true };
}

function handlePrismaError(err: unknown): ActionState {
  console.error("[GradeActions] Prisma error:", err);
  
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return { 
          success: false, 
          error: true, 
          message: "Grade level already exists in this school." 
        };
      case "P2003":
        return { 
          success: false, 
          error: true, 
          message: "Invalid school configuration. Please contact administrator." 
        };
      case "P2025":
        return { 
          success: false, 
          error: true, 
          message: "Grade record not found." 
        };
      default:
        return { 
          success: false, 
          error: true, 
          message: `Database error: ${err.message}` 
        };
    }
  }
  
  return { 
    success: false, 
    error: true, 
    message: err instanceof Error ? err.message : "An unexpected error occurred." 
  };
}

// ─── CREATE GRADE ────────────────────────────────────────────────────────────
export const createGrade = async (
  _state: ActionState,
  data: GradeSchema
): Promise<ActionState> => {
  try {
    // 1. Get session and validate
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    console.log("[createGrade] Session:", { schoolId, userId: session.id });

    // 2. Validate school access
    const schoolAccess = await validateSchoolAccess(schoolId);
    if (!schoolAccess.valid) {
      return { success: false, error: true, message: schoolAccess.message };
    }

    // 3. Validate input data
    const parsed = gradeSchema.safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      console.error("[createGrade] Validation errors:", errors);
      return {
        success: false,
        error: true,
        message: Object.values(errors.fieldErrors).flat().join(", "),
      };
    }

    const { level } = parsed.data;

    // 4. Check if grade level already exists in this school
    const existingGrade = await prisma.grade.findFirst({
      where: { 
        level: level,
        schoolId: schoolId,
      },
    });
    
    if (existingGrade) {
      return { 
        success: false, 
        error: true, 
        message: `Grade level "${level}" already exists in this school.` 
      };
    }

    // 5. Create grade
    const newGrade = await prisma.grade.create({
      data: {
        schoolId: Number(schoolId),
        level: level,
      },
    });

    console.log("[createGrade] Success:", newGrade);
    // revalidatePath("/list/grades");
    
    return { 
      success: true, 
      error: false, 
      message: "Grade created successfully" 
    };
  } catch (err) {
    return handlePrismaError(err);
  }
};

// ─── UPDATE GRADE ────────────────────────────────────────────────────────────
export const updateGrade = async (
  _state: ActionState,
  data: GradeSchema
): Promise<ActionState> => {
  // Validate ID
  if (!data.id) {
    return { success: false, error: true, message: "Grade ID is required for update." };
  }

  try {
    // 1. Get session and validate
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    // 2. Validate school access
    const schoolAccess = await validateSchoolAccess(schoolId);
    if (!schoolAccess.valid) {
      return { success: false, error: true, message: schoolAccess.message };
    }

    // 3. Validate input data
    const parsed = gradeSchema.safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return {
        success: false,
        error: true,
        message: Object.values(errors.fieldErrors).flat().join(", "),
      };
    }

    const { id, level } = parsed.data;

    // 4. Check if grade exists and belongs to the school
    const existingGrade = await prisma.grade.findFirst({
      where: {
        id: id,
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

    // 5. Check for duplicate grade level (excluding current)
    const duplicateGrade = await prisma.grade.findFirst({
      where: {
        level: level,
        schoolId: schoolId,
        NOT: { id: id }
      },
    });

    if (duplicateGrade) {
      return { 
        success: false, 
        error: true, 
        message: `Grade level "${level}" already exists in this school.` 
      };
    }

    // 6. Update grade
    await prisma.grade.update({
      where: { id: id },
      data: { level: level },
    });

    console.log("[updateGrade] Success for grade ID:", id);
    // revalidatePath("/list/grades");
    
    return { 
      success: true, 
      error: false, 
      message: "Grade updated successfully" 
    };
  } catch (err) {
    return handlePrismaError(err);
  }
};

// ─── DELETE GRADE ────────────────────────────────────────────────────────────
export const deleteGrade = async (
  _state: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const id = formData.get("id") as string;
  
  if (!id) {
    return { success: false, error: true, message: "Grade ID is required for deletion." };
  }

  const gradeId = parseInt(id);
  
  try {
    // 1. Get session and validate
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    // 2. Validate school access
    const schoolAccess = await validateSchoolAccess(schoolId);
    if (!schoolAccess.valid) {
      return { success: false, error: true, message: schoolAccess.message };
    }

    // 3. Check if grade exists and belongs to the school
    const grade = await prisma.grade.findFirst({
      where: {
        id: gradeId,
        schoolId: schoolId,
      },
      include: {
        students: {
          select: { id: true }
        },
        classes: {
          select: { id: true, name: true }
        },
      },
    });

    if (!grade) {
      return { 
        success: false, 
        error: true, 
        message: "Grade not found or does not belong to your school." 
      };
    }

    // 4. Check for dependent data
    if (grade.students.length > 0) {
      return { 
        success: false, 
        error: true, 
        message: `Cannot delete grade "${grade.level}". It has ${grade.students.length} student(s) assigned. Please reassign or delete the students first.` 
      };
    }

    if (grade.classes.length > 0) {
      const classNames = grade.classes.map(c => c.name).join(", ");
      return { 
        success: false, 
        error: true, 
        message: `Cannot delete grade "${grade.level}". It has ${grade.classes.length} class(es): ${classNames}. Please reassign or delete the classes first.` 
      };
    }

    // 5. Delete grade
    await prisma.grade.delete({
      where: { id: gradeId },
    });

    console.log("[deleteGrade] Success for grade ID:", gradeId);
    // revalidatePath("/list/grades");
    
    return { 
      success: true, 
      error: false, 
      message: "Grade deleted successfully" 
    };
  } catch (err) {
    return handlePrismaError(err);
  }
};

// ─── GET ALL GRADES (with filtering) ─────────────────────────────────────────
export const getAllGrades = async (options?: {
  includeClasses?: boolean;
  includeStudents?: boolean;
  sortBy?: "level" | "createdAt";
  sortOrder?: "asc" | "desc";
}) => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER", "CASHIER", "STAFF"]);
    const { schoolId } = session;

    if (!schoolId) {
      console.error("[getAllGrades] No schoolId in session");
      return [];
    }

    const {
      includeClasses = false,
      includeStudents = false,
      sortBy = "level",
      sortOrder = "asc"
    } = options || {};

    const grades = await prisma.grade.findMany({
      where: {
        schoolId: schoolId,
      },
      include: {
        ...(includeClasses && {
          classes: {
            select: {
              id: true,
              name: true,
              capacity: true,
              _count: {
                select: { students: true }
              }
            }
          }
        }),
        ...(includeStudents && {
          students: {
            select: {
              id: true,
              name: true,
              surname: true,
              username: true
            },
            take: 10 // Limit for performance
          }
        }),
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    });
    
    return grades;
  } catch (err) {
    console.error("[getAllGrades] Error:", err);
    return [];
  }
};

// ─── GET GRADE BY ID ─────────────────────────────────────────────────────────
export const getGradeById = async (
  id: number,
  options?: {
    includeClasses?: boolean;
    includeStudents?: boolean;
  }
) => {
  try {
    const session = await requireSession(["ADMIN", "TEACHER", "CASHIER", "STAFF"]);
    const { schoolId } = session;

    if (!schoolId) {
      console.error("[getGradeById] No schoolId in session");
      return null;
    }

    const { includeClasses = false, includeStudents = false } = options || {};

    const grade = await prisma.grade.findFirst({
      where: {
        id: id,
        schoolId: schoolId,
      },
      include: {
        ...(includeClasses && {
          classes: {
            include: {
              supervisor: {
                select: {
                  id: true,
                  name: true,
                  surname: true
                }
              },
              _count: {
                select: { students: true }
              }
            }
          }
        }),
        ...(includeStudents && {
          students: {
            select: {
              id: true,
              name: true,
              surname: true,
              username: true,
              email: true,
              phone: true,
              sex: true,
              img: true,
              parent: {
                select: {
                  name: true,
                  phone: true
                }
              }
            },
            orderBy: {
              name: "asc"
            }
          }
        }),
      },
    });
    
    return grade;
  } catch (err) {
    console.error("[getGradeById] Error:", err);
    return null;
  }
};

// ─── GET GRADE STATISTICS ────────────────────────────────────────────────────
export const getGradeStatistics = async () => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    if (!schoolId) {
      return null;
    }

    const stats = await prisma.grade.findMany({
      where: {
        schoolId: schoolId,
      },
      select: {
        id: true,
        level: true,
        _count: {
          select: {
            students: true,
            classes: true,
          }
        },
        classes: {
          select: {
            _count: {
              select: {
                students: true
              }
            }
          }
        }
      },
      orderBy: {
        level: "asc"
      }
    });

    // Calculate total students per grade
    const formattedStats = stats.map(grade => ({
      id: grade.id,
      level: grade.level,
      totalStudents: grade._count.students,
      totalClasses: grade._count.classes,
      averageClassSize: grade._count.classes > 0 
        ? Math.round(grade.classes.reduce((sum, c) => sum + c._count.students, 0) / grade._count.classes)
        : 0
    }));

    return formattedStats;
  } catch (err) {
    console.error("[getGradeStatistics] Error:", err);
    return null;
  }
};

// ─── BULK CREATE GRADES ──────────────────────────────────────────────────────
export const bulkCreateGrades = async (
  levels: number[]
): Promise<ActionState> => {
  try {
    const session = await requireSession(["ADMIN"]);
    const { schoolId } = session;

    const schoolAccess = await validateSchoolAccess(schoolId);
    if (!schoolAccess.valid) {
      return { success: false, error: true, message: schoolAccess.message };
    }

    // Get existing grades
    const existingGrades = await prisma.grade.findMany({
      where: {
        schoolId: schoolId,
        level: { in: levels }
      },
      select: { level: true }
    });

    const existingLevels = new Set(existingGrades.map(g => g.level));
    const newLevels = levels.filter(level => !existingLevels.has(level));

    if (newLevels.length === 0) {
      return { 
        success: false, 
        error: true, 
        message: "All specified grade levels already exist." 
      };
    }

    // Create multiple grades
    await prisma.grade.createMany({
      data: newLevels.map(level => ({
        schoolId: Number(schoolId),
        level: level,
      })),
      skipDuplicates: true,
    });

    console.log(`[bulkCreateGrades] Created ${newLevels.length} new grades`);
    revalidatePath("/list/grades");
    
    return { 
      success: true, 
      error: false, 
      message: `Successfully created ${newLevels.length} grade(s).` 
    };
  } catch (err) {
    return handlePrismaError(err);
  }
};