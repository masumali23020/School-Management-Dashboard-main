// src/app/(dashboard)/list/finance/page.tsx


import { getFinanceAcademicYears } from "../../../../Actions/financeActions/financeActions";
import FinanceClient from "@/components/FinanceClient.tsx";
import { getUserRoleAuth } from "@/lib/logsessition";
import { redirect } from "next/navigation";
;

export default async function FinancePage() {
  const { role } = await getUserRoleAuth();
  if (!["admin", "cashier"].includes(role as string)) redirect("/");

  const academicYears = await getFinanceAcademicYears();
  const currentYear   = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  if (!academicYears.includes(currentYear)) academicYears.unshift(currentYear);

  return (
    <FinanceClient
      academicYears={academicYears}
    />
  );
}