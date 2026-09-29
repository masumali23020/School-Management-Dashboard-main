// src/app/(dashboard)/list/salary/page.tsx
// Access: ADMIN (full manage) | CASHIER (view only)

import SalaryStructureClient from "@/components/Salarystructureclient";
import prisma from "@/lib/db";
import { getUserRoleAuth } from "@/lib/logsessition";
import { redirect } from "next/navigation";

export default async function SalaryManagementPage() {
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

  // Fetch data filtered by school
  const [salaryTypes, employees, structures] = await Promise.all([
    // Only salary types from this school
    prisma.salaryType.findMany({ 
      where: { schoolId: schoolId },
      orderBy: { name: "asc" } 
    }),

    // Only employees from this school
    prisma.employee.findMany({
      where: { schoolId: schoolId },
      select: {
        id:          true,
        name:        true,
        surname:     true,
        img:         true,
        phone:       true,
        role:        true,
        designation: true,
        subjects:    { select: { name: true } },
      },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
    }),

    // Only salary structures from this school (through employee relation)
    prisma.employeeSalaryStructure.findMany({
      where: { 
        schoolId: schoolId,
        employee: { schoolId: schoolId }
      },
      include: { 
        employee: true, 
        salaryType: true 
      },
      orderBy: [
        { employee: { name: "asc" } },
        { salaryType: { name: "asc" } },
      ],
    }),
  ]);

  // If no salary types exist, create default ones for this school
  if (salaryTypes.length === 0 && normalizedRole === "ADMIN") {
    const defaultSalaryTypes = [
      { name: "Basic Salary", description: "Monthly basic salary", isRecurring: true, isActive: true },
      { name: "House Rent", description: "Monthly house rent allowance", isRecurring: true, isActive: true },
      { name: "Medical Allowance", description: "Monthly medical allowance", isRecurring: true, isActive: true },
      { name: "Conveyance", description: "Monthly transport allowance", isRecurring: true, isActive: true },
      { name: "Bonus", description: "Festival or performance bonus", isRecurring: false, isActive: true },
    ];

    await prisma.salaryType.createMany({
      data: defaultSalaryTypes.map(st => ({
        ...st,
        schoolId: schoolId,
      })),
      skipDuplicates: true,
    });

    // Refetch salary types
    const newSalaryTypes = await prisma.salaryType.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: "asc" }
    });
    
    return (
      <SalaryStructureClient
        role={normalizedRole}
        salaryTypes={newSalaryTypes.map((s) => ({
          id:          s.id,
          name:        s.name,
          description: s.description,
          isActive:    s.isActive,
          isRecurring: s.isRecurring,
        }))}
        employees={employees.map((e) => ({
          id:           e.id,
          name:         e.name,
          surname:      e.surname,
          img:          e.img,
          phone:        e.phone,
          employeeRole: e.role as "ADMIN" | "CASHIER" | "TEACHER" | "STAFF",
          designation:  e.designation,
          subjects:     e.subjects.map((s) => s.name),
        }))}
        structures={[]}
      />
    );
  }

  return (
    <SalaryStructureClient
      role={normalizedRole}
      salaryTypes={salaryTypes.map((s) => ({
        id:          s.id,
        name:        s.name,
        description: s.description,
        isActive:    s.isActive,
        isRecurring: s.isRecurring,
      }))}
      employees={employees.map((e) => ({
        id:           e.id,
        name:         e.name,
        surname:      e.surname,
        img:          e.img,
        phone:        e.phone,
        employeeRole: e.role as "ADMIN" | "CASHIER" | "TEACHER" | "STAFF",
        designation:  e.designation,
        subjects:     e.subjects.map((s) => s.name),
      }))}
      structures={structures.map((s) => ({
        id:             s.id,
        employeeId:     s.employeeId,
        employeeName:   `${s.employee.name} ${s.employee.surname}`,
        employeeRole:   s.employee.role as "ADMIN" | "CASHIER" | "TEACHER" | "STAFF",
        salaryTypeId:   s.salaryTypeId,
        salaryTypeName: s.salaryType.name,
        isRecurring:    s.salaryType.isRecurring,
        amount:         s.amount.toNumber(),
      }))}
    />
  );
}