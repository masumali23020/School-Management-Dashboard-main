// src/app/(dashboard)/list/salary/page.tsx
// Admin: manage salary types + teacher salary structures

import SalaryStructureClient from "@/components/Salarystructureclient";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";


export default async function SalaryManagementPage() {
  const { role } = await getUserRole();
  if (!["admin", "cashier"].includes(role)) redirect("/");

  const [salaryTypes, teachers, structures] = await Promise.all([
    prisma.salaryType.findMany({ orderBy: { name: "asc" } }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true, img: true, phone: true,
        subjects: { select: { name: true } } },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
    }),
    prisma.teacherSalaryStructure.findMany({
      include: { teacher: true, salaryType: true },
      orderBy: [{ teacher: { name: "asc" } }, { salaryType: { name: "asc" } }],
    }),
  ]);

  return (
    <SalaryStructureClient
      role={role}
      salaryTypes={salaryTypes.map((s) => ({
        id:          s.id,
        name:        s.name,
        description: s.description,
        isActive:    s.isActive,
        isRecurring: s.isRecurring,
      }))}
      teachers={teachers.map((t) => ({
        id:       t.id,
        name:     t.name,
        surname:  t.surname,
        img:      t.img,
        phone:    t.phone,
        subjects: t.subjects.map((s) => s.name),
      }))}
      structures={structures.map((s) => ({
        id:            s.id,
        teacherId:     s.teacherId,
        teacherName:   `${s.teacher.name} ${s.teacher.surname}`,
        salaryTypeId:  s.salaryTypeId,
        salaryTypeName: s.salaryType.name,
        isRecurring:   s.salaryType.isRecurring,
        amount:        s.amount,
      }))}
    />
  );
}