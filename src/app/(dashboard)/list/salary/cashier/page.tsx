// src/app/(dashboard)/list/salary/cashier/page.tsx

import SalaryCashierClient from "@/components/Salarycashierclient ";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";


export default async function SalaryCashierPage() {
  const { role } = await getUserRole();
  if (!["admin", "cashier"].includes(role)) redirect("/");

  const [salaryTypes, teachers] = await Promise.all([
    prisma.salaryType.findMany({
      where:   { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true, img: true, phone: true,
        subjects: { select: { name: true } },
        salaryStructures: { include: { salaryType: true } },
      },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
    }),
  ]);

  return (
    <SalaryCashierClient
      salaryTypes={salaryTypes.map((s) => ({
        id: s.id, name: s.name, isRecurring: s.isRecurring,
      }))}
      teachers={teachers.map((t) => ({
        id:       t.id,
        name:     t.name,
        surname:  t.surname,
        img:      t.img,
        phone:    t.phone,
        subjects: t.subjects.map((s) => s.name),
        salaryStructures: t.salaryStructures.map((s) => ({
          id:            s.id,
          salaryTypeId:  s.salaryTypeId,
          salaryTypeName: s.salaryType.name,
          isRecurring:   s.salaryType.isRecurring,
          amount:        s.amount,
        })),
      }))}
    />
  );
}