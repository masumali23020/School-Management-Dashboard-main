/*
  Warnings:

  - You are about to drop the column `startDate` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ClassFeeStructure` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ClassFeeStructure` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `EmployeeSalaryPayment` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `EmployeeSalaryPayment` table. All the data in the column will be lost.
  - You are about to drop the column `mcqMarks` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `practicalMarks` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `writtenMarks` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ExamPublish` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `ExamPublish` table. All the data in the column will be lost.
  - You are about to drop the column `publishedBy` on the `ExamPublish` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ExamPublish` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `mcqScore` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `practicalScore` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `writtenScore` on the `Result` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[date,studentId,lessonId]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,name]` on the table `Class` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,name]` on the table `FeeType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,level]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,examId]` on the table `Result` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,assignmentId]` on the table `Result` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,name]` on the table `SalaryType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,name]` on the table `Subject` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schoolId` to the `Announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `ClassSubjectTeacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `EmployeeSalaryPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `EmployeeSalaryStructure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `FeeType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Grade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `SalaryType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Subject` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'STANDARD', 'POPULAR');

-- CreateEnum
CREATE TYPE "SMSStatus" AS ENUM ('SENT', 'FAILED', 'PENDING');

-- DropIndex
DROP INDEX "Attendance_date_studentId_key";

-- DropIndex
DROP INDEX "Class_name_key";

-- DropIndex
DROP INDEX "ExamPublish_examId_classId_session_key";

-- DropIndex
DROP INDEX "FeeType_name_key";

-- DropIndex
DROP INDEX "Grade_level_key";

-- DropIndex
DROP INDEX "SalaryType_name_key";

-- DropIndex
DROP INDEX "StudentClassHistory_classId_academicYear_rollNumber_key";

-- DropIndex
DROP INDEX "Subject_name_key";

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "startDate";

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ClassFeeStructure" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "ClassSubjectTeacher" ADD COLUMN     "schoolId" INTEGER NOT NULL,
ALTER COLUMN "academicYear" SET DEFAULT '2026';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "password" TEXT,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EmployeeSalaryPayment" DROP COLUMN "createdAt",
DROP COLUMN "remarks",
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EmployeeSalaryStructure" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "mcqMarks",
DROP COLUMN "practicalMarks",
DROP COLUMN "writtenMarks";

-- AlterTable
ALTER TABLE "ExamPublish" DROP COLUMN "createdAt",
DROP COLUMN "publishedAt",
DROP COLUMN "publishedBy",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "FeePayment" DROP COLUMN "createdAt",
DROP COLUMN "remarks";

-- AlterTable
ALTER TABLE "FeeType" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "password" TEXT,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Result" DROP COLUMN "mcqScore",
DROP COLUMN "practicalScore",
DROP COLUMN "writtenScore";

-- AlterTable
ALTER TABLE "SalaryType" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "password" TEXT,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan" (
    "id" SERIAL NOT NULL,
    "name" "PlanType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "maxStudents" INTEGER NOT NULL DEFAULT 50,
    "maxEmployees" INTEGER NOT NULL DEFAULT 5,
    "hasSMS" BOOLEAN NOT NULL DEFAULT false,
    "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "schoolName" TEXT NOT NULL,
    "shortName" TEXT,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "eiinNumber" TEXT,
    "academicSession" TEXT NOT NULL DEFAULT '2026',
    "planId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "smsBalance" INTEGER NOT NULL DEFAULT 0,
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSlider" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HomeSlider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSLog" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "receiverNo" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SMSStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SMSLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentPublish" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AssignmentPublish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_name_key" ON "subscription_plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "School_eiinNumber_key" ON "School"("eiinNumber");

-- CreateIndex
CREATE INDEX "School_slug_idx" ON "School"("slug");

-- CreateIndex
CREATE INDEX "School_isActive_idx" ON "School"("isActive");

-- CreateIndex
CREATE INDEX "HomeSlider_schoolId_idx" ON "HomeSlider"("schoolId");

-- CreateIndex
CREATE INDEX "HomeSlider_isActive_idx" ON "HomeSlider"("isActive");

-- CreateIndex
CREATE INDEX "SMSLog_schoolId_idx" ON "SMSLog"("schoolId");

-- CreateIndex
CREATE INDEX "SMSLog_status_idx" ON "SMSLog"("status");

-- CreateIndex
CREATE INDEX "SMSLog_sentAt_idx" ON "SMSLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentPublish_assignmentId_key" ON "AssignmentPublish"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentPublish_classId_idx" ON "AssignmentPublish"("classId");

-- CreateIndex
CREATE INDEX "AssignmentPublish_isPublished_idx" ON "AssignmentPublish"("isPublished");

-- CreateIndex
CREATE INDEX "Announcement_schoolId_idx" ON "Announcement"("schoolId");

-- CreateIndex
CREATE INDEX "Announcement_classId_idx" ON "Announcement"("classId");

-- CreateIndex
CREATE INDEX "Announcement_date_idx" ON "Announcement"("date");

-- CreateIndex
CREATE INDEX "Announcement_isPublic_idx" ON "Announcement"("isPublic");

-- CreateIndex
CREATE INDEX "Assignment_lessonId_idx" ON "Assignment"("lessonId");

-- CreateIndex
CREATE INDEX "Assignment_dueDate_idx" ON "Assignment"("dueDate");

-- CreateIndex
CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_lessonId_idx" ON "Attendance"("lessonId");

-- CreateIndex
CREATE INDEX "Attendance_date_studentId_idx" ON "Attendance"("date", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_date_studentId_lessonId_key" ON "Attendance"("date", "studentId", "lessonId");

-- CreateIndex
CREATE INDEX "Class_schoolId_idx" ON "Class"("schoolId");

-- CreateIndex
CREATE INDEX "Class_gradeId_idx" ON "Class"("gradeId");

-- CreateIndex
CREATE INDEX "Class_supervisorId_idx" ON "Class"("supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_key" ON "Class"("schoolId", "name");

-- CreateIndex
CREATE INDEX "ClassFeeStructure_classId_idx" ON "ClassFeeStructure"("classId");

-- CreateIndex
CREATE INDEX "ClassSubjectTeacher_schoolId_idx" ON "ClassSubjectTeacher"("schoolId");

-- CreateIndex
CREATE INDEX "ClassSubjectTeacher_classId_idx" ON "ClassSubjectTeacher"("classId");

-- CreateIndex
CREATE INDEX "ClassSubjectTeacher_teacherId_idx" ON "ClassSubjectTeacher"("teacherId");

-- CreateIndex
CREATE INDEX "ClassSubjectTeacher_academicYear_idx" ON "ClassSubjectTeacher"("academicYear");

-- CreateIndex
CREATE INDEX "Employee_schoolId_idx" ON "Employee"("schoolId");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "Employee_schoolId_role_idx" ON "Employee"("schoolId", "role");

-- CreateIndex
CREATE INDEX "EmployeeSalaryPayment_schoolId_idx" ON "EmployeeSalaryPayment"("schoolId");

-- CreateIndex
CREATE INDEX "EmployeeSalaryPayment_employeeId_idx" ON "EmployeeSalaryPayment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeSalaryPayment_invoiceNumber_idx" ON "EmployeeSalaryPayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "EmployeeSalaryPayment_paidAt_idx" ON "EmployeeSalaryPayment"("paidAt");

-- CreateIndex
CREATE INDEX "EmployeeSalaryPayment_schoolId_academicYear_idx" ON "EmployeeSalaryPayment"("schoolId", "academicYear");

-- CreateIndex
CREATE INDEX "EmployeeSalaryStructure_schoolId_idx" ON "EmployeeSalaryStructure"("schoolId");

-- CreateIndex
CREATE INDEX "EmployeeSalaryStructure_employeeId_idx" ON "EmployeeSalaryStructure"("employeeId");

-- CreateIndex
CREATE INDEX "Event_schoolId_idx" ON "Event"("schoolId");

-- CreateIndex
CREATE INDEX "Event_classId_idx" ON "Event"("classId");

-- CreateIndex
CREATE INDEX "Event_startTime_idx" ON "Event"("startTime");

-- CreateIndex
CREATE INDEX "Event_isPublic_idx" ON "Event"("isPublic");

-- CreateIndex
CREATE INDEX "Exam_lessonId_idx" ON "Exam"("lessonId");

-- CreateIndex
CREATE INDEX "ExamPublish_classId_idx" ON "ExamPublish"("classId");

-- CreateIndex
CREATE INDEX "ExamPublish_isPublished_idx" ON "ExamPublish"("isPublished");

-- CreateIndex
CREATE INDEX "FeePayment_studentId_idx" ON "FeePayment"("studentId");

-- CreateIndex
CREATE INDEX "FeePayment_classId_idx" ON "FeePayment"("classId");

-- CreateIndex
CREATE INDEX "FeePayment_invoiceNumber_idx" ON "FeePayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "FeePayment_paidAt_idx" ON "FeePayment"("paidAt");

-- CreateIndex
CREATE INDEX "FeePayment_academicYear_idx" ON "FeePayment"("academicYear");

-- CreateIndex
CREATE INDEX "FeePayment_studentId_academicYear_idx" ON "FeePayment"("studentId", "academicYear");

-- CreateIndex
CREATE INDEX "FeeType_schoolId_idx" ON "FeeType"("schoolId");

-- CreateIndex
CREATE INDEX "FeeType_isActive_idx" ON "FeeType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FeeType_schoolId_name_key" ON "FeeType"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Grade_schoolId_idx" ON "Grade"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_schoolId_level_key" ON "Grade"("schoolId", "level");

-- CreateIndex
CREATE INDEX "Lesson_classId_idx" ON "Lesson"("classId");

-- CreateIndex
CREATE INDEX "Lesson_teacherId_idx" ON "Lesson"("teacherId");

-- CreateIndex
CREATE INDEX "Lesson_subjectId_idx" ON "Lesson"("subjectId");

-- CreateIndex
CREATE INDEX "Lesson_day_idx" ON "Lesson"("day");

-- CreateIndex
CREATE INDEX "Parent_schoolId_idx" ON "Parent"("schoolId");

-- CreateIndex
CREATE INDEX "Parent_phone_idx" ON "Parent"("phone");

-- CreateIndex
CREATE INDEX "Result_studentId_idx" ON "Result"("studentId");

-- CreateIndex
CREATE INDEX "Result_examId_idx" ON "Result"("examId");

-- CreateIndex
CREATE INDEX "Result_assignmentId_idx" ON "Result"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_examId_key" ON "Result"("studentId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_studentId_assignmentId_key" ON "Result"("studentId", "assignmentId");

-- CreateIndex
CREATE INDEX "SalaryType_schoolId_idx" ON "SalaryType"("schoolId");

-- CreateIndex
CREATE INDEX "SalaryType_isActive_idx" ON "SalaryType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryType_schoolId_name_key" ON "SalaryType"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- CreateIndex
CREATE INDEX "Student_gradeId_idx" ON "Student"("gradeId");

-- CreateIndex
CREATE INDEX "Student_schoolId_classId_idx" ON "Student"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "StudentClassHistory_studentId_idx" ON "StudentClassHistory"("studentId");

-- CreateIndex
CREATE INDEX "StudentClassHistory_classId_idx" ON "StudentClassHistory"("classId");

-- CreateIndex
CREATE INDEX "StudentClassHistory_academicYear_idx" ON "StudentClassHistory"("academicYear");

-- CreateIndex
CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeSlider" ADD CONSTRAINT "HomeSlider_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryType" ADD CONSTRAINT "SalaryType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeType" ADD CONSTRAINT "FeeType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSLog" ADD CONSTRAINT "SMSLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentPublish" ADD CONSTRAINT "AssignmentPublish_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentPublish" ADD CONSTRAINT "AssignmentPublish_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
