// src/app/(dashboard)/list/fees/page.tsx
// Admin: manage fee types and class fee structures

import FeeStructureClient from "@/components/Feestructureclient";
import prisma from "@/lib/db";
import { getUserRole } from "@/lib/utlis";
import { redirect } from "next/navigation";


export default async function FeeManagementPage() {
  const { role } = await getUserRole();
  if (role !== "admin") redirect("/");

  const [feeTypes, classes, structures] = await Promise.all([
    prisma.feeType.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      include: { grade: true },
      orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
    }),
    prisma.classFeeStructure.findMany({
      include: {
        feeType: true,
        class: { include: { grade: true } },
      },
      orderBy: [{ class: { grade: { level: "asc" } } }, { feeType: { name: "asc" } }],
    }),
  ]);

  return (
    <FeeStructureClient
      feeTypes={feeTypes.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        isActive: f.isActive,
      }))}
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        gradeLevel: c.grade.level,
      }))}
      structures={structures.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        gradeLevel: s.class.grade.level,
        feeTypeId: s.feeTypeId,
        feeTypeName: s.feeType.name,
        amount: s.amount,
      }))}
    />
  );
}