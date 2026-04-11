// src/app/(dashboard)/list/fees/page.tsx
// Admin: manage fee types and class fee structures (School Wise)

import FeeStructureClient from "@/components/Feestructureclient";
import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { redirect } from "next/navigation";

export default async function FeeManagementPage() {
  const { role, schoolId } = await getUserRoleAuth();
  
  const normalizedRole = role?.toLowerCase() || "";
  // Admin can edit; Cashier can view; others are redirected
  if (!["admin", "cashier"].includes(normalizedRole)) redirect("/");

  // Check if user has school access
  if (!schoolId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500 py-8">
          <p>Error: No school associated with this account.</p>
          <p className="text-sm mt-2">Please contact administrator.</p>
        </div>
      </div>
    );
  }

  // Fetch school info for display
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      schoolName: true,
      shortName: true,
      address: true,
      phone: true,
      email: true,
      academicSession: true,
    },
  });

  const [feeTypes, classes, structures] = await Promise.all([
    // Only fee types from this school
    prisma.feeType.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: "asc" },
    }),
    
    // Only classes from this school
    prisma.class.findMany({
      where: { schoolId: schoolId },
      include: { grade: true },
      orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
    }),
    
    // Only fee structures from this school (through class relation)
    prisma.classFeeStructure.findMany({
      where: {
        class: {
          schoolId: schoolId
        }
      },
      include: {
        feeType: true,
        class: { include: { grade: true } },
      },
      orderBy: [{ class: { grade: { level: "asc" } } }, { feeType: { name: "asc" } }],
    }),
  ]);

  // Prepare school info for client
  const schoolInfo = {
    id: school?.id || schoolId,
    name: school?.schoolName || "School",
    shortName: school?.shortName || null,
    address: school?.address || null,
    phone: school?.phone || null,
    email: school?.email || null,
    academicSession: school?.academicSession || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  };

  // If no fee types exist, show message for admin
  if (feeTypes.length === 0 && normalizedRole === "admin") {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-yellow-500 py-8">
          <p>No fee types configured for this school.</p>
          <p className="text-sm mt-2">Please use the form below to create fee types.</p>
        </div>
        <FeeStructureClient
          feeTypes={[]}
          classes={classes.map((c) => ({
            id: c.id,
            name: c.name,
            gradeLevel: c.grade.level,
          }))}
          structures={[]}
          role={normalizedRole}
          schoolInfo={schoolInfo}
        />
      </div>
    );
  }

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
      role={normalizedRole}
      schoolInfo={schoolInfo}
    />
  );
}