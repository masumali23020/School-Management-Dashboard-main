// app/actions/result-actions.ts
"use server";

import prisma from "@/lib/db";
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
          updatedAt: new Date()
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

    return { 
      success: false, 
      error: true, 
      message: err.message || "Failed to save result" 
    };
  }
};