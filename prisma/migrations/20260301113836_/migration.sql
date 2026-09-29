/*
  Warnings:

  - You are about to drop the column `classId` on the `Subject` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_classId_fkey";

-- DropIndex
DROP INDEX "Subject_name_classId_key";

-- AlterTable
ALTER TABLE "Subject" DROP COLUMN "classId";
