import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getMobileToken } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  const token = await getMobileToken(request);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const where = { id: token.sub, schoolId: token.schoolId };
  const profile = token.userType === "student"
    ? await prisma.student.findFirst({ where, select: { id: true, username: true, name: true, surname: true, email: true, phone: true, img: true, role: true, class: { select: { id: true, name: true } }, grade: { select: { id: true, level: true } } } })
    : token.userType === "parent"
      ? await prisma.parent.findFirst({ where, select: { id: true, username: true, name: true, surname: true, email: true, phone: true, students: { select: { id: true, name: true, surname: true, class: { select: { id: true, name: true } }, grade: { select: { id: true, level: true } } } } } })
      : await prisma.employee.findFirst({ where, select: { id: true, username: true, name: true, surname: true, email: true, phone: true, img: true, role: true, designation: true } });

  if (!profile) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, user: { ...profile, role: token.role }, schoolId: token.schoolId });
}