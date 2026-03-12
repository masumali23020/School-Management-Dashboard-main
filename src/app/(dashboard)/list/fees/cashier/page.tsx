// src/app/(dashboard)/list/fees/cashier/page.tsx

import CashierClient from "@/components/Cashierclient";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";


export default async function CashierPage() {
  const { role } = await getUserRole();
  if (!["admin", "cashier"].includes(role)) redirect("/");

  const classes = await prisma.class.findMany({
    include: { grade: true },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });

  return (
    <CashierClient
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: c.grade.level,
      }))}
    />
  );
}