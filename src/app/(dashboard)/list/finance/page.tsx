// src/app/(dashboard)/list/finance/page.tsx
import prisma from "@/lib/db";

import { getFinanceAcademicYears } from "../../../../Actions/financeActions/financeActions";
import FinanceClient from "@/components/FinanceClient.tsx";
import { getUserRoleAuth } from "@/lib/logsessition";
import { redirect } from "next/navigation";
;

export default async function FinancePage() {

  const academicYears = await getFinanceAcademicYears();
  const currentYear   = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  if (!academicYears.includes(currentYear)) academicYears.unshift(currentYear);
 const { role, schoolId,name} = await getUserRoleAuth();
  // const normalizedRole = (role || "").toLowerCase();
  if (!["admin", "cashier"].includes(role as string)) redirect("/");
  // if (!["admin", "cashier"].includes(normalizedRole)) redirect("/");
  if (!schoolId) redirect("/");

 

  const [ school] = await Promise.all([


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
    <FinanceClient
      academicYears={academicYears}
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