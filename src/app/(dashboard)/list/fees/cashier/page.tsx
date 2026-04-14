// src/app/(dashboard)/list/fees/cashier/page.tsx

import CashierClient from "@/components/Cashierclient";
import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";

import { redirect } from "next/navigation";


export default async function CashierPage() {
  const { role, schoolId } = await getUserRoleAuth();
  const normalizedRole = (role || "").toLowerCase();
  if (!["admin", "cashier"].includes(normalizedRole)) redirect("/");
  if (!schoolId) redirect("/");

  const [classes, school] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: Number(schoolId) },
      include: { grade: true },
      orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
    }),
    prisma.school.findUnique({
      where: { id: Number(schoolId) },
      select: { academicSession: true },
    }),
  ]);

  const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const defaultSession = school?.academicSession || currentYear;

  return (
    <CashierClient
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: c.grade.level,
      }))}
      defaultSession={defaultSession}
    />
  );
}