// src/app/(dashboard)/list/salary/payments/page.tsx

import SalaryPaymentListClient from "@/components/Salarypaymentlistclient";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";


export default async function SalaryPaymentListPage() {
  const { role } = await getUserRole();
  if (!["admin", "HisabRokhok"].includes(role)) redirect("/");

  const [salaryTypes, yearRows] = await Promise.all([
    prisma.salaryType.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.teacherSalaryPayment.findMany({
      distinct: ["academicYear"],
      select:   { academicYear: true },
      orderBy:  { academicYear: "desc" },
    }),
  ]);

  return (
    <SalaryPaymentListClient
      salaryTypes={salaryTypes}
      academicYears={yearRows.map((r) => r.academicYear)}
    />
  );
}