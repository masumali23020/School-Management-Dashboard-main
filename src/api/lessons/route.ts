// app/api/lessons/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');

    const where: any = {};
    
    if (classId) {
      where.classId = parseInt(classId);
    }

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        class: true,
        teacher: true,
      },
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json(lessons);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}