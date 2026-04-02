// src/app/(dashboard)/list/salary/cashier/page.tsx
// Access: ADMIN | CASHIER
// TEACHER / STAFF → redirected to "/"

import SalaryCashierClient from "@/components/Salarycashierclient ";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";

export default async function SalaryCashierPage() {
  const { role } = await getUserRole();

  const normalizedRole = role.toUpperCase();
  if (!["ADMIN", "CASHIER"].includes(normalizedRole)) redirect("/");

  const [salaryTypes, employees] = await Promise.all([
    prisma.salaryType.findMany({
      where:   { isActive: true },
      orderBy: { name: "asc" },
    }),

    prisma.employee.findMany({
      select: {
        id:       true,
        name:     true,
        surname:  true,
        img:      true,
        phone:    true,
        role:     true,
        subjects: { select: { name: true } },
        salaryStructures: { include: { salaryType: true } },
      },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
    }),
  ]);

  return (
    <SalaryCashierClient
      salaryTypes={salaryTypes.map((s) => ({
        id:          s.id,
        name:        s.name,
        isRecurring: s.isRecurring,
      }))}
      teachers={employees.map((e) => ({
        id:       e.id,
        name:     e.name,
        surname:  e.surname,
        img:      e.img,
        phone:    e.phone,
        subjects: e.subjects.map((s) => s.name),
        salaryStructures: e.salaryStructures.map((s) => ({
          id:             s.id,
          salaryTypeId:   s.salaryTypeId,
          salaryTypeName: s.salaryType.name,
          isRecurring:    s.salaryType.isRecurring,
          amount:         s.amount.toNumber(),
        })),
      }))}
    />
  );
}