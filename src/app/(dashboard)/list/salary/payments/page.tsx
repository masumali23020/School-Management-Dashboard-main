// src/app/(dashboard)/list/salary/payments/page.tsx
// Access: ADMIN only
// NOTE: "HisabRokhok" is not a valid UserRole enum value in your Prisma schema.
//       Your enum has: ADMIN | CASHIER | TEACHER | STAFF
//       If you need a bookkeeper role, add it to the UserRole enum in schema.prisma
//       and re-run `prisma migrate dev`. For now this page is ADMIN-only.
//
// To grant CASHIER access too, change the check to:
//   if (!["ADMIN", "CASHIER"].includes(normalizedRole)) redirect("/");

import SalaryPaymentListClient from "@/components/Salarypaymentlistclient";
import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { redirect } from "next/navigation";

export default async function SalaryPaymentListPage() {
 const { role } = await getUserRoleAuth();
  if (!["admin", "cashier"].includes(role as string)) redirect("/");

 

  const [salaryTypes, yearRows] = await Promise.all([
    prisma.salaryType.findMany({
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    prisma.employeeSalaryPayment.findMany({
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