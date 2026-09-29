/*
  Warnings:

  - Added the required column `totalScore` to the `Result` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "mcqMarks" INTEGER,
ADD COLUMN     "practicalMarks" INTEGER,
ADD COLUMN     "totalMarks" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "writtenMarks" INTEGER;

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "mcqScore" INTEGER,
ADD COLUMN     "practicalScore" INTEGER,
ADD COLUMN     "totalScore" INTEGER NOT NULL,
ADD COLUMN     "writtenScore" INTEGER;

-- CreateTable
CREATE TABLE "StudentClassHistory" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "gradeId" INTEGER NOT NULL,
    "academicYear" TEXT NOT NULL,
    "rollNumber" INTEGER NOT NULL,
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentClassHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentClassHistory_studentId_academicYear_key" ON "StudentClassHistory"("studentId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "StudentClassHistory_classId_academicYear_rollNumber_key" ON "StudentClassHistory"("classId", "academicYear", "rollNumber");

-- AddForeignKey
ALTER TABLE "StudentClassHistory" ADD CONSTRAINT "StudentClassHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassHistory" ADD CONSTRAINT "StudentClassHistory_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassHistory" ADD CONSTRAINT "StudentClassHistory_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
