// src/app/(dashboard)/list/salary/cashier/page.tsx
// Access: ADMIN | CASHIER
// TEACHER / STAFF → redirected to "/"

import SalaryCashierClient from "@/components/Salarycashierclient ";
import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { redirect } from "next/navigation";

export default async function SalaryCashierPage() {
  const { role, schoolId } = await getUserRoleAuth();

  const normalizedRole = role?.toUpperCase() || "";
  if (!["ADMIN", "CASHIER"].includes(normalizedRole)) redirect("/");

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

  // Fetch school information
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      schoolName: true,
      shortName: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
      bannerUrl: true,
      academicSession: true,
      isActive: true,
    },
  });

  if (!school) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-red-500 py-8">
          <p>School not found.</p>
          <p className="text-sm mt-2">Please contact administrator.</p>
        </div>
      </div>
    );
  }

  const [salaryTypes, employees] = await Promise.all([
    // Only salary types from this school
    prisma.salaryType.findMany({
      where: { 
        isActive: true,
        schoolId: schoolId 
      },
      orderBy: { name: "asc" },
    }),

    // Only employees from this school
    prisma.employee.findMany({
      where: { 
        schoolId: schoolId,
        role: {
          in: ["TEACHER", "STAFF", "ADMIN", "CASHIER"]
        }
      },
      select: {
        id:       true,
        name:     true,
        surname:  true,
        img:      true,
        phone:    true,
        role:     true,
        subjects: { select: { name: true } },
        salaryStructures: { 
          where: { schoolId: schoolId },
          include: { salaryType: true } 
        },
      },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
    }),
  ]);

  // Prepare school info for client
// Prepare school info for client with default values for null fields
  const schoolInfo = {
    id: school.id,
    name: school.schoolName,
    shortName: school.shortName,
    address: school.address ?? "", 
    phone: school.phone ?? "",     
    email: school.email ?? "",    
    logoUrl: school.logoUrl,
    bannerUrl: school.bannerUrl,
    academicSession: school.academicSession,
    isActive: school.isActive,
  };

  // If no salary types exist, show message
  if (salaryTypes.length === 0) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="text-center text-yellow-500 py-8">
          <p>No salary types configured for this school.</p>
          <p className="text-sm mt-2">Please contact administrator to set up salary types.</p>
        </div>
      </div>
    );
  }

  return (
    <SalaryCashierClient
      salaryTypes={salaryTypes.map((s) => ({
        id:          s.id,
        name:        s.name,
        isRecurring: s.isRecurring,
      }))}
      teachers={employees.map((e) => ({
        id:       e.id,
        name:     e.name,
        surname:  e.surname,
        img:      e.img,
        phone:    e.phone,
        role:     e.role,
        subjects: e.subjects.map((s) => s.name),
        salaryStructures: e.salaryStructures.map((s) => ({
          id:             s.id,
          salaryTypeId:   s.salaryTypeId,
          salaryTypeName: s.salaryType.name,
          isRecurring:    s.salaryType.isRecurring,
          amount:         s.amount.toNumber(),
        })),
      }))}
      schoolInfo={schoolInfo}
    />
  );
}