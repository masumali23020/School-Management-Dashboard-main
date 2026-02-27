// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Zod schema for API validation
const attendanceApiSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  lessonId: z.number(),
  studentId: z.string(),
  present: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate with Zod
    const validatedData = attendanceApiSchema.parse(body);
    
    // Check if attendance already exists for this student, lesson, and date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: validatedData.studentId,
        lessonId: validatedData.lessonId,
        date: {
          equals: validatedData.date,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Attendance already recorded for this student on this date" },
        { status: 400 }
      );
    }

    const attendance = await prisma.attendance.create({
      data: validatedData,
      include: {
        student: true,
        lesson: true,
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}