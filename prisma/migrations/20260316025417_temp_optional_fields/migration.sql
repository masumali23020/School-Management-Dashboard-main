/*
  Warnings:

  - You are about to drop the column `collectedBy` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Teacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeacherSalaryPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeacherSalaryStructure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_SubjectToTeacher` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CASHIER', 'TEACHER', 'STAFF');

-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_supervisorId_fkey";

-- DropForeignKey
ALTER TABLE "ClassSubjectTeacher" DROP CONSTRAINT "ClassSubjectTeacher_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSalaryPayment" DROP CONSTRAINT "TeacherSalaryPayment_salaryStructureId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSalaryPayment" DROP CONSTRAINT "TeacherSalaryPayment_salaryTypeId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSalaryPayment" DROP CONSTRAINT "TeacherSalaryPayment_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSalaryStructure" DROP CONSTRAINT "TeacherSalaryStructure_salaryTypeId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSalaryStructure" DROP CONSTRAINT "TeacherSalaryStructure_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "_SubjectToTeacher" DROP CONSTRAINT "_SubjectToTeacher_A_fkey";

-- DropForeignKey
ALTER TABLE "_SubjectToTeacher" DROP CONSTRAINT "_SubjectToTeacher_B_fkey";

-- DropIndex
DROP INDEX "ClassFeeStructure_classId_idx";

-- DropIndex
DROP INDEX "FeePayment_academicYear_idx";

-- DropIndex
DROP INDEX "FeePayment_classId_idx";

-- DropIndex
DROP INDEX "FeePayment_paidAt_idx";

-- DropIndex
DROP INDEX "FeePayment_studentId_idx";

-- AlterTable
ALTER TABLE "FeePayment" DROP COLUMN "collectedBy",
DROP COLUMN "updatedAt",
ADD COLUMN     "collectedById" TEXT;

-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "Teacher";

-- DropTable
DROP TABLE "TeacherSalaryPayment";

-- DropTable
DROP TABLE "TeacherSalaryStructure";

-- DropTable
DROP TABLE "_SubjectToTeacher";

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "img" TEXT,
    "bloodType" TEXT NOT NULL,
    "sex" "UserSex" NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "designation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalaryStructure" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "salaryTypeId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalaryPayment" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "salaryTypeId" INTEGER NOT NULL,
    "salaryStructureId" INTEGER,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "monthLabel" TEXT,
    "remarks" TEXT,
    "processedById" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeToSubject" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EmployeeToSubject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_username_key" ON "Employee"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_phone_key" ON "Employee"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalaryStructure_employeeId_salaryTypeId_key" ON "EmployeeSalaryStructure"("employeeId", "salaryTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalaryPayment_invoiceNumber_key" ON "EmployeeSalaryPayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "_EmployeeToSubject_B_index" ON "_EmployeeToSubject"("B");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubjectTeacher" ADD CONSTRAINT "ClassSubjectTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryStructure" ADD CONSTRAINT "EmployeeSalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryStructure" ADD CONSTRAINT "EmployeeSalaryStructure_salaryTypeId_fkey" FOREIGN KEY ("salaryTypeId") REFERENCES "SalaryType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryPayment" ADD CONSTRAINT "EmployeeSalaryPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryPayment" ADD CONSTRAINT "EmployeeSalaryPayment_salaryTypeId_fkey" FOREIGN KEY ("salaryTypeId") REFERENCES "SalaryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryPayment" ADD CONSTRAINT "EmployeeSalaryPayment_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "EmployeeSalaryStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryPayment" ADD CONSTRAINT "EmployeeSalaryPayment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToSubject" ADD CONSTRAINT "_EmployeeToSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToSubject" ADD CONSTRAINT "_EmployeeToSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
