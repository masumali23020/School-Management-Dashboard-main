import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getMobileToken } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  const token = await getMobileToken(request);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (token.userType === "employee") {
    return NextResponse.json({ success: true, role: token.role, message: "Use role-specific web dashboard APIs for employee management." });
  }

  const studentIds = token.userType === "student"
    ? [token.sub]
    : (await prisma.student.findMany({ where: { parentId: token.sub, schoolId: token.schoolId }, select: { id: true } })).map((student) => student.id);

  const [students, announcements, events, results, attendance] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: studentIds }, schoolId: token.schoolId }, select: { id: true, name: true, surname: true, class: { select: { name: true } }, grade: { select: { level: true } } } }),
    prisma.announcement.findMany({ where: { schoolId: token.schoolId, OR: [{ isPublic: true }, { class: { students: { some: { id: { in: studentIds } } } } }] }, orderBy: { date: "desc" }, take: 10 }),
    prisma.event.findMany({ where: { schoolId: token.schoolId, OR: [{ isPublic: true }, { class: { students: { some: { id: { in: studentIds } } } } }] }, orderBy: { startTime: "asc" }, take: 10 }),
    prisma.result.findMany({ where: { schoolId: token.schoolId, studentId: { in: studentIds } }, include: { exam: { select: { id: true, title: true, session: true } } }, orderBy: { id: "desc" }, take: 20 }),
    prisma.attendance.findMany({ where: { schoolId: token.schoolId, studentId: { in: studentIds } }, select: { id: true, studentId: true, date: true, present: true }, orderBy: { date: "desc" }, take: 30 }),
  ]);

  return NextResponse.json({ success: true, role: token.role, students, announcements, events, results, attendance });
}