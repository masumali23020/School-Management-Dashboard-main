import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { createMobileToken, type MobileRole } from "@/lib/mobile-auth";

const loginSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "schoolId, username and password are required" }, { status: 400 });
  }

  const { schoolId, username, password } = parsed.data;
  const school = await prisma.school.findFirst({
    where: { id: schoolId, isActive: true },
    select: { id: true, schoolName: true, shortName: true, logoUrl: true, academicSession: true, expiredAt: true },
  });
  if (!school || (school.expiredAt && school.expiredAt < new Date())) {
    return NextResponse.json({ success: false, error: "School is unavailable" }, { status: 401 });
  }

  let user: { id: string; name: string; username: string; password: string | null; role: MobileRole; userType: "employee" | "student" | "parent" } | null = null;
  const employee = await prisma.employee.findFirst({ where: { schoolId, username }, select: { id: true, name: true, username: true, password: true, role: true } });
  if (employee) user = { ...employee, role: employee.role as MobileRole, userType: "employee" };

  if (!user) {
    const student = await prisma.student.findFirst({ where: { schoolId, username }, select: { id: true, name: true, username: true, password: true } });
    if (student) user = { ...student, role: "STUDENT", userType: "student" };
  }

  if (!user) {
    const parent = await prisma.parent.findFirst({ where: { schoolId, username }, select: { id: true, name: true, username: true, password: true } });
    if (parent) user = { ...parent, role: "PARENT", userType: "parent" };
  }

  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const accessToken = await createMobileToken({
    sub: user.id,
    role: user.role,
    schoolId,
    userType: user.userType,
    name: user.name,
    username: user.username,
  });

  return NextResponse.json({
    success: true,
    accessToken,
    tokenType: "Bearer",
    expiresIn: 60 * 60 * 24 * 30,
    user: { id: user.id, name: user.name, username: user.username, role: user.role, schoolId },
    school: { id: school.id, name: school.shortName ?? school.schoolName, logoUrl: school.logoUrl, academicSession: school.academicSession },
  });
}