"use server";

import prisma from "../../lib/db";
import { ExamSchema } from "../../lib/FormValidationSchema";
import { getUserRoleAuth } from "@/lib/logsessition";
import { revalidatePath } from "next/cache";

type CreateState = { success: boolean; error: boolean; message?: string };

export const createExam = async (
  prevState: CreateState,
  data: ExamSchema & { classIds?: number[] }
) => {
  try {
    console.log("=== createExam called ===");
    console.log("data:", JSON.stringify(data, null, 2));

    const { schoolId, role } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "স্কুল আইডি পাওয়া যায়নি।" };
    }

    if (role !== "admin") {
      return { success: false, error: true, message: "Only admin can create exams." };
    }

    const classIds = data.classIds || [];
    if (classIds.length === 0) {
      return { success: false, error: true, message: "কমপক্ষে একটি class select করুন।" };
    }

    // session: Int (year number)
    const session = Number(data.session) || new Date().getFullYear();

    // ── selected classes verify ────────────────────────────────────────────
    const validClasses = await prisma.class.findMany({
      where: {
        id: { in: classIds },
        schoolId: Number(schoolId),
      },
      select: { id: true, name: true, grade: true },
    });

    console.log("Valid classes:", validClasses.length);

    if (validClasses.length === 0) {
      return { success: false, error: true, message: "কোনো valid class পাওয়া যায়নি।" };
    }

    let created = 0;
    let skipped = 0;
    const errorMessages: string[] = [];

    for (const cls of validClasses) {
      // CST থেকে subjects খুঁজুন
      const cstList = await prisma.classSubjectTeacher.findMany({
        where: {
          classId: cls.id,
          schoolId: Number(schoolId),
          academicYear: session.toString(), // CST-এ String হলে
        },
        include: {
          subject: { select: { id: true, name: true } },
          teacher: { select: { id: true, role: true } },
        },
      });

      console.log(`Class "${cls.name}" - CST found: ${cstList.length}`);

      const validCsts = cstList.filter((cst) => cst.teacher.role === "TEACHER");

      if (validCsts.length === 0) {
        errorMessages.push(`"${cls.name}"-এ session ${session}-এ কোনো subject নেই।`);
        skipped++;
        continue;
      }

      for (const cst of validCsts) {

        // ── Lesson খুঁজুন বা তৈরি করুন ──────────────────────────────────
        let lesson = await prisma.lesson.findFirst({
          where: {
            classSubjectTeacherId: cst.id,
            class: { schoolId: Number(schoolId) },
          },
          select: { id: true },
        });

        if (!lesson) {
          try {
            lesson = await prisma.lesson.create({
              data: {
                name: `${cst.subject.name} Exam`,
                day: "MONDAY",
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                subjectId: cst.subject.id,
                classId: cls.id,
                teacherId: cst.teacher.id,
                classSubjectTeacherId: cst.id,
              },
              select: { id: true },
            });
            console.log(`Lesson created: ${lesson.id}`);
          } catch (lessonErr) {
            console.error(`Lesson create failed:`, lessonErr);
            skipped++;
            continue;
          }
        }

        // ── Exam তৈরি করুন ────────────────────────────────────────────
        try {
          await prisma.exam.create({
            data: {
              title: data.title,
              startTime: new Date(data.startTime),
              endTime: new Date(data.endTime),
              session: session,           // ✅ Int
              totalMarks: 100,            // schema-তে শুধু totalMarks আছে
              lessonId: lesson.id,
            },
          });
          created++;
          console.log(`✅ Exam created: ${cst.subject.name} in ${cls.name}`);
        } catch (examErr) {
          console.error(`Exam create failed:`, examErr);
          skipped++;
        }
      }
    }

    console.log(`=== SUMMARY: created=${created}, skipped=${skipped} ===`);

    // revalidatePath("/list/exams");

    if (created === 0) {
      return {
        success: false,
        error: true,
        message: errorMessages.length > 0
          ? errorMessages.join(" | ")
          : `কোনো exam তৈরি হয়নি। ${skipped}টি skip হয়েছে।`,
      };
    }

    return {
      success: true,
      error: false,
      message: `✅ ${created}টি exam তৈরি হয়েছে ${validClasses.length}টি class-এ।`,
    };

  } catch (err: any) {
    console.error("createExam Error:", err);
    return {
      success: false,
      error: true,
      message: err?.message || "পরীক্ষা তৈরি করতে সমস্যা হয়েছে।",
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE EXAM
// ─────────────────────────────────────────────────────────────────────────────

export const updateExam = async (
  prevState: CreateState,
  data: ExamSchema & { classIds?: number[] }
) => {
  try {
    const { schoolId, role } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "Unauthorized!" };
    }

    if (role !== "admin") {
      return { success: false, error: true, message: "Only admin can update exams." };
    }

    const existingExam = await prisma.exam.findFirst({
      where: {
        id: data.id,
        lesson: { class: { schoolId: Number(schoolId) } },
      },
    });

    if (!existingExam) {
      return { success: false, error: true, message: "Exam not found in your school." };
    }

    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        session: Number(data.session),  // ✅ Int
        totalMarks: 100,
      },
    });

    // revalidatePath("/list/exams");
    return { success: true, error: false, message: "Exam updated successfully." };
  } catch (err: any) {
    console.error("updateExam error:", err);
    return { success: false, error: true, message: "Something went wrong." };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE EXAM
// ─────────────────────────────────────────────────────────────────────────────

export const deleteExam = async (
  prevState: CreateState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const { schoolId, role } = await getUserRoleAuth();

    if (!schoolId) {
      return { success: false, error: true, message: "Unauthorized!" };
    }

    if (role !== "admin") {
      return { success: false, error: true, message: "Only admin can delete exams." };
    }

    const exam = await prisma.exam.findFirst({
      where: {
        id: parseInt(id),
        lesson: { class: { schoolId: Number(schoolId) } },
      },
      include: { results: { select: { id: true } } },
    });

    if (!exam) {
      return { success: false, error: true, message: "Exam not found in your school." };
    }

    if (exam.results.length > 0) {
      return {
        success: false,
        error: true,
        message: `Cannot delete. ${exam.results.length} result(s) exist. Delete results first.`,
      };
    }

    await prisma.exam.delete({ where: { id: parseInt(id) } });

    // revalidatePath("/list/exams");
    return { success: true, error: false, message: "Exam deleted successfully." };
  } catch (err: any) {
    console.error("deleteExam error:", err);
    return { success: false, error: true, message: "Something went wrong." };
  }
};