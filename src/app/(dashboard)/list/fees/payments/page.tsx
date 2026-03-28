// src/app/(dashboard)/list/fees/payments/page.tsx

import PaymentListClient from "@/components/Paymentlistclient ";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";

export default async function PaymentListPage() {
  const { role } = await getUserRole();
  if (!["admin", "HisabRokhok"].includes(role)) redirect("/");

  const classes = await prisma.class.findMany({
    include: { grade: true },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });

  // Distinct academic years
  const yearRows = await prisma.feePayment.findMany({
    distinct: ["academicYear"],
    select:   { academicYear: true },
    orderBy:  { academicYear: "desc" },
  });

  return (
    <PaymentListClient
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      academicYears={yearRows.map((r) => r.academicYear)}
    />
  );
}