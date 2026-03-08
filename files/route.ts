import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTeacherByClerkId, getClassesByTeacher } from "@/lib/queries/result.queries";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await getTeacherByClerkId(userId);
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const classes = await getClassesByTeacher(teacher.id);

    return NextResponse.json({ classes, teacher });
  } catch (err) {
    console.error("[GET /api/teacher/classes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
