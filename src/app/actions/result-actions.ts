// app/actions/result-actions.ts
"use server";

import  prisma from "../../lib/db";

import { revalidatePath } from "next/cache";
import { z } from "zod";

const resultSchema = z.object({
  score: z.number().min(0).max(100),
  studentId: z.string(),
  examId: z.number().optional(),
  assignmentId: z.number().optional(),
});

export async function getClasses() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        grade: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    return { success: true, data: classes };
  } catch (error) {
    return { success: false, error: "Failed to fetch classes" };
  }
}

export async function getExamsByClass(classId: number) {
  try {
    const exams = await prisma.exam.findMany({
      where: {
        lesson: {
          classId: classId,
        },
      },
      include: {
        lesson: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });
    return { success: true, data: exams };
  } catch (error) {
    return { success: false, error: "Failed to fetch exams" };
  }
}

export async function getAssignmentsByClass(classId: number) {
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        lesson: {
          classId: classId,
        },
      },
      include: {
        lesson: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });
    return { success: true, data: assignments };
  } catch (error) {
    return { success: false, error: "Failed to fetch assignments" };
  }
}

export async function getSubjectsByClass(classId: number) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        classId: classId,
      },
      include: {
        subject: true,
      },
      distinct: ['subjectId'],
    });
    
    const subjects = lessons.map(lesson => lesson.subject);
    return { success: true, data: subjects };
  } catch (error) {
    return { success: false, error: "Failed to fetch subjects" };
  }
}

export async function getStudentsWithResults(classId: number, examId?: number, assignmentId?: number) {
  try {
    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        results: {
          where: {
            ...(examId ? { examId } : {}),
            ...(assignmentId ? { assignmentId } : {}),
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
        },
      },
    //   orderBy: {
    //     rollNo: 'asc',
    //   },
    });
    return { success: true, data: students };
  } catch (error) {
    return { success: false, error: "Failed to fetch students" };
  }
}

export async function saveAllResults(formData: FormData) {
  try {
    const examId = formData.get("examId") ? parseInt(formData.get("examId") as string) : undefined;
    const assignmentId = formData.get("assignmentId") ? parseInt(formData.get("assignmentId") as string) : undefined;
    
    const results = [];
    
    // Loop through all form data entries
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("score_")) {
        const studentId = key.replace("score_", "");
        const score = parseInt(value as string);
        
        if (!isNaN(score)) {
          // Check if result exists
          const existingResult = await prisma.result.findFirst({
            where: {
              studentId,
              ...(examId ? { examId } : {}),
              ...(assignmentId ? { assignmentId } : {}),
            },
          });

          if (existingResult) {
            // Update existing result
            const result = await prisma.result.update({
              where: { id: existingResult.id },
              data: { score },
            });
            results.push(result);
          } else {
            // Create new result
            const result = await prisma.result.create({
              data: {
                score,
                studentId,
                examId,
                assignmentId,
              },
            });
            results.push(result);
          }
        }
      }
    }

    revalidatePath("/dashboard/list/results");
    return { success: true, data: results };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save results" };
  }
}

export async function deleteResult(resultId: number) {
  try {
    await prisma.result.delete({
      where: { id: resultId },
    });
    revalidatePath("/dashboard/results");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete result" };
  }
}