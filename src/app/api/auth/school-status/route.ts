import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await auth();
  const user = session?.user;

  if (!user?.schoolId) {
    return NextResponse.json({ ok: false, reason: "SCHOOL_NOT_FOUND" }, { status: 401 });
  }

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    include: {
      plan: {
        select: {
          maxStudents: true,
          maxEmployees: true,
        },
      },
      _count: {
        select: {
          students: true,
          employees: true,
        },
      },
    },
  });

  if (!school) {
    return NextResponse.json({ ok: false, reason: "SCHOOL_NOT_FOUND" }, { status: 403 });
  }

  if (!school.isActive) {
    return NextResponse.json({ ok: false, reason: "SCHOOL_DISABLED" }, { status: 403 });
  }

  if (school.expiredAt && school.expiredAt < new Date()) {
    return NextResponse.json({ ok: false, reason: "SUBSCRIPTION_EXPIRED" }, { status: 403 });
  }

  const studentsLimitReached =
    school.plan.maxStudents > 0 && school._count.students >= school.plan.maxStudents;
  const employeesLimitReached =
    school.plan.maxEmployees > 0 && school._count.employees >= school.plan.maxEmployees;

  if (studentsLimitReached || employeesLimitReached) {
    return NextResponse.json({ ok: false, reason: "PLAN_LIMIT_REACHED" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
