// src/app/(dashboard)/list/salary/page.tsx
// Access: ADMIN (full manage) | CASHIER (view only)

import SalaryStructureClient from "@/components/Salarystructureclient";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";

export default async function SalaryManagementPage() {
  const { role } = await getUserRole();

  const normalizedRole = role.toUpperCase();
  if (!["ADMIN", "CASHIER"].includes(normalizedRole)) redirect("/");

  const [salaryTypes, employees, structures] = await Promise.all([
    prisma.salaryType.findMany({ orderBy: { name: "asc" } }),

    prisma.employee.findMany({
      select: {
        id:          true,
        name:        true,
        surname:     true,
        img:         true,
        phone:       true,
        role:        true,
        designation: true,
        subjects:    { select: { name: true } },
      },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
    }),

    prisma.employeeSalaryStructure.findMany({
      include: { employee: true, salaryType: true },
      orderBy: [
        { employee: { name: "asc" } },
        { salaryType: { name: "asc" } },
      ],
    }),
  ]);

  return (
    <SalaryStructureClient
      role={normalizedRole}
      salaryTypes={salaryTypes.map((s) => ({
        id:          s.id,
        name:        s.name,
        description: s.description,
        isActive:    s.isActive,
        isRecurring: s.isRecurring,
      }))}
      employees={employees.map((e) => ({
        id:           e.id,
        name:         e.name,
        surname:      e.surname,
        img:          e.img,
        phone:        e.phone,
        employeeRole: e.role as "ADMIN" | "CASHIER" | "TEACHER" | "STAFF",
        designation:  e.designation,
        subjects:     e.subjects.map((s) => s.name),
      }))}
      structures={structures.map((s) => ({
        id:             s.id,
        employeeId:     s.employeeId,
        employeeName:   `${s.employee.name} ${s.employee.surname}`,
        employeeRole:   s.employee.role as "ADMIN" | "CASHIER" | "TEACHER" | "STAFF",
        salaryTypeId:   s.salaryTypeId,
        salaryTypeName: s.salaryType.name,
        isRecurring:    s.salaryType.isRecurring,
        amount:         s.amount.toNumber(),
      }))}
    />
  );
}