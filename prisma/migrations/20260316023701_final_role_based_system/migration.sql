/*
  Warnings:

  - A unique constraint covering the columns `[examId]` on the table `ExamPublish` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExamPublish_examId_key" ON "ExamPublish"("examId");
