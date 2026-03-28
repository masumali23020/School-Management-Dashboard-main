import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTeacherByClerkId, getSubjectsByClassAndTeacher } from "@/lib/queries/result.queries";
import { getClassDataQuerySchema } from "@/lib/validations/result.schema";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await getTeacherByClerkId(userId);
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = getClassDataQuerySchema.safeParse({
      classId: searchParams.get("classId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid classId", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const subjects = await getSubjectsByClassAndTeacher(
      parsed.data.classId,
      teacher.id
    );

    return NextResponse.json({ subjects });
  } catch (err) {
    console.error("[GET /api/teacher/subjects]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
