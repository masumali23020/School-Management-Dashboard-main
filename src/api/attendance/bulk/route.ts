// app/api/attendance/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const bulkAttendanceSchema = z.object({
  attendances: z.array(z.object({
    id: z.number().optional(),
    studentId: z.string(),
    lessonId: z.number(),
    date: z.string().transform(str => new Date(str)),
    present: z.boolean(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = bulkAttendanceSchema.parse(body);

    // ট্রানজেকশনে সব অপারেশন একসাথে করুন
    const results = await prisma.$transaction(async (tx) => {
      const operations = validatedData.attendances.map(async (attendance) => {
        if (attendance.id) {
          // আপডেট existing
          return tx.attendance.update({
            where: { id: attendance.id },
            data: { present: attendance.present },
          });
        } else {
          // চেক করুন ডুপ্লিকেট আছে কিনা
          const existing = await tx.attendance.findFirst({
            where: {
              studentId: attendance.studentId,
              lessonId: attendance.lessonId,
              date: attendance.date,
            },
          });

          if (existing) {
            // আপডেট যদি আগে থেকে থাকে
            return tx.attendance.update({
              where: { id: existing.id },
              data: { present: attendance.present },
            });
          } else {
            // ক্রিয়েট নতুন
            return tx.attendance.create({
              data: {
                studentId: attendance.studentId,
                lessonId: attendance.lessonId,
                date: attendance.date,
                present: attendance.present,
              },
            });
          }
        }
      });

      return Promise.all(operations);
    });

    return NextResponse.json({
      message: "Attendances saved successfully",
      count: results.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}