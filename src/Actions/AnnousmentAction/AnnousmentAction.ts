// app/actions/result-actions.ts
"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { AnnouncementSchema, AssignmentSchema, EventSchema,  ExamSchema } from "../../lib/FormValidationSchema";

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



export const createAnnouncement = async (
  currentState: CreateState,
  data: AnnouncementSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.announcement.create({
      data: {
        id: data.id,
        title: data.title,
        description: data.description,
        date: data?.date ,
        classId: data.classId,
        

      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAnnouncement = async (
  currentState: CreateState,
  data: AnnouncementSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.announcement.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        description: data.description,
        date: data?.date,
        classId: data.classId,

      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAnnouncement = async (
  currentState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.announcement.delete({
      where: {
        id: parseInt(id),
        // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};