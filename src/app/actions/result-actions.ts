// app/actions/result-actions.ts
"use server";

import prisma  from "@/lib/db";
import { revalidatePath } from "next/cache";

// ==================== GET CLASSES ====================
export async function getClasses() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        grade: {
          select: {
            id: true,
            level: true
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });
    
    return { success: true, data: classes };
  } catch (error: any) {
    console.error("❌ Error fetching classes:", error);
    return { success: false, error: "Failed to fetch classes", data: [] };
  }
}

// ==================== GET EXAMS BY CLASS ====================
export async function getExamsByClass(classId: number) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { classId: classId },
      select: { id: true }
    });
    
    const lessonIds = lessons.map(l => l.id);
    
    if (lessonIds.length === 0) {
      return { success: true, data: [] };
    }
    
    const exams = await prisma.exam.findMany({
      where: {
        lessonId: { in: lessonIds }
      },
      include: {
        lesson: {
          include: {
            subject: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { startTime: "desc" }
    });
    
    return { success: true, data: exams };
  } catch (error: any) {
    console.error("❌ Error fetching exams:", error);
    return { success: false, error: "Failed to fetch exams", data: [] };
  }
}

// ==================== GET ASSIGNMENTS BY CLASS ====================
export async function getAssignmentsByClass(classId: number) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { classId: classId },
      select: { id: true }
    });
    
    const lessonIds = lessons.map(l => l.id);
    
    if (lessonIds.length === 0) {
      return { success: true, data: [] };
    }
    
    const assignments = await prisma.assignment.findMany({
      where: {
        lessonId: { in: lessonIds }
      },
      include: {
        lesson: {
          include: {
            subject: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { startDate: "desc" }
    });
    
    return { success: true, data: assignments };
  } catch (error: any) {
    console.error("❌ Error fetching assignments:", error);
    return { success: false, error: "Failed to fetch assignments", data: [] };
  }
}

// ==================== GET SUBJECTS BY CLASS ====================
export async function getSubjectsByClass(classId: number) {
  try {
    const classSubjects = await prisma.classSubjectTeacher.findMany({
      where: { classId: classId },
      include: {
        subject: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    const subjects = classSubjects.map(cs => cs.subject);
    return { success: true, data: subjects };
  } catch (error: any) {
    console.error("❌ Error fetching subjects:", error);
    return { success: false, error: "Failed to fetch subjects", data: [] };
  }
}

// ==================== GET STUDENTS BY CLASS ====================
export async function getStudentsByClass(classId: number) {
  try {
    console.log("🔍 Fetching students for class:", classId);
    
    const students = await prisma.student.findMany({
      where: { classId: classId },
      select: {
        id: true,
        // rollNo: true,
        name: true,
        surname: true,
        class: {
          select: {
            grade: {
              select: {
                level: true
              }
            }
          }
        }
      },
      // orderBy: { rollNo: "asc" }
    });
    
    console.log(`✅ Found ${students.length} students`);
    return { success: true, data: students };
  } catch (error: any) {
    console.error("❌ Error fetching students:", error);
    return { success: false, error: "Failed to fetch students", data: [] };
  }
}


// ==================== SAVE/UPDATE EXAM RESULT ====================

// app/actions/result-actions.ts

// ==================== SAVE/UPDATE ASSIGNMENT RESULT (FIXED) ====================
export async function saveAssignmentResult(data: {
  studentId: string;
  assignmentId: number;
  totalScore: number;
}) {
  try {
    console.log("💾 Saving assignment result with data:", JSON.stringify(data, null, 2));
    
    // Validate data
    if (!data.studentId) {
      throw new Error("Student ID is required");
    }
    if (!data.assignmentId) {
      throw new Error("Assignment ID is required");
    }
    if (typeof data.totalScore !== 'number' || isNaN(data.totalScore)) {
      throw new Error("Valid score is required");
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId }
    });

    if (!student) {
      throw new Error(`Student not found with ID: ${data.studentId}`);
    }

    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: data.assignmentId }
    });

    if (!assignment) {
      throw new Error(`Assignment not found with ID: ${data.assignmentId}`);
    }

    console.log("✅ Student and assignment verified");

    // Check if result exists
    const existing = await prisma.result.findFirst({
      where: {
        studentId: data.studentId,
        assignmentId: data.assignmentId
      }
    });

    let result;
    let operation = 'created';

    if (existing) {
      // UPDATE existing result
      result = await prisma.result.update({
        where: { id: existing.id },
        data: {
          score: data.totalScore,
          totalScore: data.totalScore
        }
      });
      operation = 'updated';
      console.log(`✅ Updated result for student ${data.studentId}`);
    } else {
      // CREATE new result
      result = await prisma.result.create({
        data: {
          score: data.totalScore,
          totalScore: data.totalScore,
          studentId: data.studentId,
          assignmentId: data.assignmentId
        }
      });
      console.log(`✅ Created result for student ${data.studentId}`);
    }

    // Revalidate the page
    revalidatePath("/dashboard/results");
    
    return { 
      success: true, 
      data: {
        id: result.id,
        score: result.score,
        totalScore: result.totalScore,
        studentId: result.studentId,
        assignmentId: result.assignmentId
      },
      operation,
      message: `Result ${operation} successfully!`
    };
  } catch (error: any) {
    console.error("❌ Error in saveAssignmentResult:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    });
    return { 
      success: false, 
      error: error.message || "Failed to save result" 
    };
  }
}





type CreateState = { success: boolean; error: boolean; message?: string };

// Result Schema Type
interface ResultSchema {
  id?: number;
  studentId: string;
  assignmentId?: number;
  examId?: number;
  score: number;
  mcqScore?: number | null;
  writtenScore?: number | null;
  practicalScore?: number | null;
  totalScore?: number;
  grade?: string;
  remarks?: string;
}

// CREATE Result
export const createResult = async (
  currentState: CreateState,
  data: ResultSchema
) => {
  try {
    // Check if result already exists
    const existingResult = await prisma.result.findFirst({
      where: {
        studentId: data.studentId,
        ...(data.assignmentId ? { assignmentId: data.assignmentId } : {}),
        ...(data.examId ? { examId: data.examId } : {})
      }
    });

    // Calculate total score if not provided
    const totalScore = data.totalScore || 
      (data.mcqScore || 0) + (data.writtenScore || 0) + (data.practicalScore || 0) || 
      data.score;

    // Calculate grade based on score
    let grade = data.grade;
    if (!grade && totalScore) {
      const percentage = (totalScore / 100) * 100; // Assuming total marks 100
      if (percentage >= 80) grade = "A+";
      else if (percentage >= 70) grade = "A";
      else if (percentage >= 60) grade = "A-";
      else if (percentage >= 50) grade = "B";
      else if (percentage >= 40) grade = "C";
      else if (percentage >= 33) grade = "D";
      else grade = "F";
    }

    if (existingResult) {
      // Update existing result
      await prisma.result.update({
        where: { id: existingResult.id },
        data: {
          score: data.score,
          mcqScore: data.mcqScore,
          writtenScore: data.writtenScore,
          practicalScore: data.practicalScore,
          totalScore: totalScore,
          grade: grade,
          remarks: data.remarks,
        }
      });

      // Revalidate the path
      if (data.assignmentId) {
        revalidatePath(`/list/assignments/${data.assignmentId}`);
      } else if (data.examId) {
        revalidatePath(`/list/exams/${data.examId}`);
      }

      return { 
        success: true, 
        error: false, 
        message: "Result updated successfully" 
      };
    } else {
      // Create new result
      await prisma.result.create({
        data: {
          studentId: data.studentId,
          assignmentId: data.assignmentId,
          examId: data.examId,
          score: data.score,
          mcqScore: data.mcqScore,
          writtenScore: data.writtenScore,
          practicalScore: data.practicalScore,
          totalScore: totalScore,
          grade: grade,
          remarks: data.remarks,
        }
      });

      // Revalidate the path
      if (data.assignmentId) {
        revalidatePath(`/list/assignments/${data.assignmentId}`);
      } else if (data.examId) {
        revalidatePath(`/list/exams/${data.examId}`);
      }

      return { 
        success: true, 
        error: false, 
        message: "Result created successfully" 
      };
    }

  } catch (err) {
    console.error("Error in createResult:", err);
    return { 
      success: false, 
      error: true, 
      message: err instanceof Error ? err.message : "Failed to create result" 
    };
  }
};

// UPDATE Result
export const updateResult = async (
  currentState: CreateState,
  data: ResultSchema
) => {
  try {
    if (!data.id) {
      return { 
        success: false, 
        error: true, 
        message: "Result ID is required" 
      };
    }

    // Calculate total score if not provided
    const totalScore = data.totalScore || 
      (data.mcqScore || 0) + (data.writtenScore || 0) + (data.practicalScore || 0) || 
      data.score;

    // Calculate grade based on score
    let grade = data.grade;
    if (!grade && totalScore) {
      const percentage = (totalScore / 100) * 100;
      if (percentage >= 80) grade = "A+";
      else if (percentage >= 70) grade = "A";
      else if (percentage >= 60) grade = "A-";
      else if (percentage >= 50) grade = "B";
      else if (percentage >= 40) grade = "C";
      else if (percentage >= 33) grade = "D";
      else grade = "F";
    }

    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: data.score,
        mcqScore: data.mcqScore,
        writtenScore: data.writtenScore,
        practicalScore: data.practicalScore,
        totalScore: totalScore,
        grade: grade,
        remarks: data.remarks,
      }
    });

    // Revalidate the path
    if (data.assignmentId) {
      revalidatePath(`/list/assignments/${data.assignmentId}`);
    } else if (data.examId) {
      revalidatePath(`/list/exams/${data.examId}`);
    }

    return { 
      success: true, 
      error: false, 
      message: "Result updated successfully" 
    };

  } catch (err) {
    console.error("Error in updateResult:", err);
    return { 
      success: false, 
      error: true, 
      message: err instanceof Error ? err.message : "Failed to update result" 
    };
  }
};

// DELETE Result
export const deleteResult = async (
  currentState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const assignmentId = data.get("assignmentId") as string;
  const examId = data.get("examId") as string;

  try {
    await prisma.result.delete({
      where: {
        id: parseInt(id)
      }
    });

    // Revalidate the path
    if (assignmentId) {
      revalidatePath(`/list/assignments/${assignmentId}`);
    } else if (examId) {
      revalidatePath(`/list/exams/${examId}`);
    }

    return { 
      success: true, 
      error: false, 
      message: "Result deleted successfully" 
    };
  } catch (err) {
    console.error("Error in deleteResult:", err);
    return { 
      success: false, 
      error: true, 
      message: err instanceof Error ? err.message : "Failed to delete result" 
    };
  }
};

// GET Results by Assignment
export const getResultsByAssignment = async (assignmentId: number) => {
  try {
    const results = await prisma.result.findMany({
      where: {
        assignmentId: assignmentId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true
              }
            }
          }
        }
      }
    });

    // Convert to Record format for easy access
    const resultsRecord = results.reduce((acc, result) => {
      acc[result.studentId] = result;
      return acc;
    }, {} as Record<string, any>);

    return { 
      success: true, 
      data: resultsRecord 
    };
  } catch (err) {
    console.error("Error in getResultsByAssignment:", err);
    return { 
      success: false, 
      error: true, 
      message: err instanceof Error ? err.message : "Failed to fetch results" 
    };
  }
};

// GET Results by Exam
export const getResultsByExam = async (examId: number) => {
  try {
    const results = await prisma.result.findMany({
      where: {
        examId: examId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true
              }
            }
          }
        }
      }
    });

    const resultsRecord = results.reduce((acc, result) => {
      acc[result.studentId] = result;
      return acc;
    }, {} as Record<string, any>);

    return { 
      success: true, 
      data: resultsRecord 
    };
  } catch (err) {
    console.error("Error in getResultsByExam:", err);
    return { 
      success: false, 
      error: true, 
      message: err instanceof Error ? err.message : "Failed to fetch results" 
    };
  }
};