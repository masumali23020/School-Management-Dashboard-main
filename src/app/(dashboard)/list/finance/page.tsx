// src/app/(dashboard)/list/finance/page.tsx


import { getFinanceAcademicYears } from "../../../../Actions/financeActions/financeActions";
import FinanceClient from "@/components/FinanceClient.tsx";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";
;

export default async function FinancePage() {
  const { role } = await getUserRole();
  if (!["admin", "cashier"].includes(role)) redirect("/");

  const academicYears = await getFinanceAcademicYears();
  const currentYear   = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  if (!academicYears.includes(currentYear)) academicYears.unshift(currentYear);

  return (
    <FinanceClient
      academicYears={academicYears}
    />
  );
}