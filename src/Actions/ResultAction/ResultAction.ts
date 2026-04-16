// app/actions/result-actions.ts
"use server";

import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

type CreateState = { 
  success: boolean; 
  error: boolean; 
  message?: string;
  data?: any;
  operation?: 'created' | 'updated';
};

interface ResultSchema {
  id?: number;
  studentId: string;
  assignmentId?: number | null;
  examId?: number | null;
  score: number;
  mcqScore?: number | null;
  writtenScore?: number | null;
  practicalScore?: number | null;
  totalScore?: number;
}

// ── Helper to verify school access ──────────────────────────────────────────
async function verifySchoolAccess(studentId: string, examId?: number | null, assignmentId?: number | null) {
  const { schoolId, role } = await getUserRoleAuth();
  
  if (!schoolId) {
    throw new Error("No school found for this account");
  }

  // Verify student belongs to the school
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      schoolId: Number(schoolId),
    },
    select: { id: true, classId: true }
  });

  if (!student) {
    throw new Error("Student not found in your school");
  }

  // If examId provided, verify exam belongs to the school's classes
  if (examId) {
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        lesson: {
          class: {
            schoolId: Number(schoolId),
          },
        },
      },
      select: { id: true }
    });

    if (!exam) {
      throw new Error("Exam not found in your school");
    }
  }

  // If assignmentId provided, verify assignment belongs to the school's classes
  if (assignmentId) {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        lesson: {
          class: {
            schoolId: Number(schoolId),
          },
        },
      },
      select: { id: true }
    });

    if (!assignment) {
      throw new Error("Assignment not found in your school");
    }
  }

  return { schoolId: Number(schoolId), student, role };
}

export const createResult = async (
  currentState: CreateState,
  data: ResultSchema
): Promise<CreateState> => {
  try {
    console.log("Received data in server action:", data);

    // Validate required fields
    if (!data.studentId) {
      return { 
        success: false, 
        error: true, 
        message: "Student ID is required" 
      };
    }

    if (!data.assignmentId && !data.examId) {
      return { 
        success: false, 
        error: true, 
        message: "Either Assignment ID or Exam ID is required" 
      };
    }

    // Verify school access
    const { schoolId, student } = await verifySchoolAccess(
      data.studentId, 
      data.examId, 
      data.assignmentId
    );

    // Calculate total score if not provided
    const totalScore = data.totalScore || 
      (data.mcqScore || 0) + (data.writtenScore || 0) + (data.practicalScore || 0) || 
      data.score;

    // Check if result already exists
    const existingResult = await prisma.result.findFirst({
      where: {
        studentId: data.studentId,
        ...(data.assignmentId ? { assignmentId: data.assignmentId } : {}),
        ...(data.examId ? { examId: data.examId } : {})
      }
    });

    let result;
    let operation: 'created' | 'updated' = 'created';

    if (existingResult) {
      // Update existing result
      result = await prisma.result.update({
        where: { id: existingResult.id },
        data: {
          score: data.score,
          mcqScore: data.mcqScore,
          writtenScore: data.writtenScore,
          practicalScore: data.practicalScore,
          totalScore: totalScore,
          
        }
      });
      operation = 'updated';
      console.log("Result updated:", result);
    } else {
      // Create new result
      result = await prisma.result.create({
        data: {
          score: data.score,
          mcqScore: data.mcqScore,
          writtenScore: data.writtenScore,
          practicalScore: data.practicalScore,
          totalScore: totalScore,
          studentId: data.studentId,
          examId: data.examId || null,
          assignmentId: data.assignmentId || null,
          schoolId,
          
        }
      });
      console.log("Result created:", result);
    }

    // Revalidate the path
    if (data.assignmentId) {
      revalidatePath(`/list/assignments/${data.assignmentId}`);
      revalidatePath("/list/assignments");
    } else if (data.examId) {
      revalidatePath(`/list/exams/${data.examId}`);
      revalidatePath("/list/exams");
    }
    revalidatePath(`/list/students/${data.studentId}`);

    return { 
      success: true, 
      error: false, 
      message: `Result ${operation} successfully`,
      data: result,
      operation
    };

  } catch (err: any) {
    console.error("Error in createResult:", err);
    
    // Prisma specific error handling
    if (err.code === 'P2002') {
      return { 
        success: false, 
        error: true, 
        message: "A result already exists for this student" 
      };
    }
    
    if (err.code === 'P2003') {
      return { 
        success: false, 
        error: true, 
        message: "Invalid student or assignment ID" 
      };
    }

    if (err.message?.includes("No school found")) {
      return { 
        success: false, 
        error: true, 
        message: err.message 
      };
    }

    return { 
      success: false, 
      error: true, 
      message: err.message || "Failed to save result" 
    };
  }
};

export const updateResult = async (
  currentState: CreateState,
  data: ResultSchema
): Promise<CreateState> => {
  if (!data.id || data.id === 0) {
    return { 
      success: false, 
      error: true, 
      message: "Invalid ID for update" 
    };
  }

  try {
    const { schoolId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "No school found for this account" 
      };
    }

    // Verify the result belongs to a student in this school
    const existingResult = await prisma.result.findFirst({
      where: {
        id: data.id,
        student: {
          schoolId: Number(schoolId),
        },
      },
      include: {
        student: true,
      },
    });

    if (!existingResult) {
      return { 
        success: false, 
        error: true, 
        message: "Result not found or does not belong to your school" 
      };
    }

    console.log("Updating ID:", data.id);
    
    await prisma.result.update({
      where: {
        id: data.id,
      },
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: data.examId,
        assignmentId: data.assignmentId,
        mcqScore: data.mcqScore,
        writtenScore: data.writtenScore,
        practicalScore: data.practicalScore,
        totalScore: data.totalScore || 
          (data.mcqScore || 0) + (data.writtenScore || 0) + (data.practicalScore || 0) || 
          data.score,
        
      }
    });

    // Revalidate relevant paths
    if (data.assignmentId) {
      revalidatePath(`/list/assignments/${data.assignmentId}`);
      revalidatePath("/list/assignments");
    } else if (data.examId) {
      revalidatePath(`/list/exams/${data.examId}`);
      revalidatePath("/list/exams");
    }
    if (data.studentId) {
      revalidatePath(`/list/students/${data.studentId}`);
    }

    return { 
      success: true, 
      error: false, 
      message: "Result updated successfully" 
    };
  } catch (err: any) {
    console.error("Error in updateResult:", err);
    return { 
      success: false, 
      error: true, 
      message: err.message || "Failed to update result" 
    };
  }
};

export const deleteResult = async (
  currentState: CreateState,
  data: FormData
): Promise<CreateState> => {
  const id = data.get("id") as string;
  
  if (!id) {
    return { 
      success: false, 
      error: true, 
      message: "Result ID is required" 
    };
  }

  try {
    const { schoolId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return { 
        success: false, 
        error: true, 
        message: "No school found for this account" 
      };
    }

    // Verify the result belongs to a student in this school
    const existingResult = await prisma.result.findFirst({
      where: {
        id: parseInt(id),
        student: {
          schoolId: Number(schoolId),
        },
      },
      include: {
        student: true,
      },
    });

    if (!existingResult) {
      return { 
        success: false, 
        error: true, 
        message: "Result not found or does not belong to your school" 
      };
    }

    console.log("Deleting ID:", id);
    
    await prisma.result.delete({
      where: {
        id: parseInt(id),
      },
    });

    // Revalidate relevant paths
    if (existingResult.assignmentId) {
      revalidatePath(`/list/assignments/${existingResult.assignmentId}`);
      revalidatePath("/list/assignments");
    } else if (existingResult.examId) {
      revalidatePath(`/list/exams/${existingResult.examId}`);
      revalidatePath("/list/exams");
    }
    if (existingResult.studentId) {
      revalidatePath(`/list/students/${existingResult.studentId}`);
    }

    return { 
      success: true, 
      error: false, 
      message: "Result deleted successfully" 
    };
  } catch (err: any) {
    console.error("Error in deleteResult:", err);
    return { 
      success: false, 
      error: true, 
      message: err.message || "Failed to delete result" 
    };
  }
};

// ─── Additional helper functions for results ────────────────────────────────

export const getResultsByStudent = async (studentId: string) => {
  try {
    const { schoolId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return [];
    }

    // Verify student belongs to the school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: Number(schoolId),
      },
    });

    if (!student) {
      return [];
    }

    const results = await prisma.result.findMany({
      where: {
        studentId: studentId,
      },
      include: {
        exam: {
          include: {
            lesson: {
              include: {
                subject: true,
              },
            },
          },
        },
        assignment: {
          include: {
            lesson: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
     
    });

    return results;
  } catch (err) {
    console.error("Error in getResultsByStudent:", err);
    return [];
  }
};

export const getResultsByExam = async (examId: number) => {
  try {
    const { schoolId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return [];
    }

    // Verify exam belongs to the school
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        lesson: {
          class: {
            schoolId: Number(schoolId),
          },
        },
      },
    });

    if (!exam) {
      return [];
    }

    const results = await prisma.result.findMany({
      where: {
        examId: examId,
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
      orderBy: {
        totalScore: "desc",
      },
    });

    return results;
  } catch (err) {
    console.error("Error in getResultsByExam:", err);
    return [];
  }
};

export const getResultsByAssignment = async (assignmentId: number) => {
  try {
    const { schoolId } = await getUserRoleAuth();
    
    if (!schoolId) {
      return [];
    }

    // Verify assignment belongs to the school
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        lesson: {
          class: {
            schoolId: Number(schoolId),
          },
        },
      },
    });

    if (!assignment) {
      return [];
    }

    const results = await prisma.result.findMany({
      where: {
        assignmentId: assignmentId,
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
      orderBy: {
        totalScore: "desc",
      },
    });

    return results;
  } catch (err) {
    console.error("Error in getResultsByAssignment:", err);
    return [];
  }
};