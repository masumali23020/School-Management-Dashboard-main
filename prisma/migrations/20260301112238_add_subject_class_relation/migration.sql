/*
  Warnings:

  - A unique constraint covering the columns `[name,classId]` on the table `Subject` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `classId` to the `Subject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "classId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_classId_key" ON "Subject"("name", "classId");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
