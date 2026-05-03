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
   const { role, schoolId,name} = await getUserRoleAuth();
  // const normalizedRole = (role || "").toLowerCase();
  if (!["admin", "cashier"].includes(role as string)) redirect("/");
  // if (!["admin", "cashier"].includes(normalizedRole)) redirect("/");
  if (!schoolId) redirect("/");

 

  const [salaryTypes, yearRows, school] = await Promise.all([
    prisma.salaryType.findMany({
      where: { schoolId: Number(schoolId) },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    prisma.employeeSalaryPayment.findMany({
        where: { schoolId: Number(schoolId) },
      distinct: ["academicYear"],
      select:   { academicYear: true },
      orderBy:  { academicYear: "desc" },
    }),
     prisma.school.findUnique({
    where: { id: Number(schoolId) },
    select: {
      schoolName: true,
      shortName: true,
      logoUrl: true,
      email: true,
      establishedYear: true,
      eiinNumber: true,
      academicSession: true,
      address: true,
      phone: true,
    }
  })
  ]);

  return (
    <SalaryPaymentListClient
      salaryTypes={salaryTypes}
      academicYears={yearRows.map((r) => r.academicYear)}
      schoolInfo={{
        name: school?.schoolName || "Unknown School",
        address: school?.address || "No Address",
        phone: school?.phone || "No Phone",
        email: school?.email || "No Email",
        establishedYear: school?.establishedYear || "No Year",
        eiinNumber: school?.eiinNumber || "No EIIN",
        academicSession: school?.academicSession || "No Session",
        logoUrl: school?.logoUrl || undefined,
        
       
      }}
      loginusername={name || "Unknown User"}
    />
  );
}