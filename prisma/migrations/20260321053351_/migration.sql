/*
  Warnings:

  - You are about to drop the column `processedById` on the `EmployeeSalaryPayment` table. All the data in the column will be lost.
  - You are about to drop the column `collectedById` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `surname` on the `Parent` table. All the data in the column will be lost.
  - Added the required column `fullName` to the `Parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wifeName` to the `Parent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EmployeeSalaryPayment" DROP CONSTRAINT "EmployeeSalaryPayment_processedById_fkey";

-- DropForeignKey
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_collectedById_fkey";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "collectedByName" TEXT;

-- AlterTable
ALTER TABLE "EmployeeSalaryPayment" DROP COLUMN "processedById",
ADD COLUMN     "collectedByName" TEXT;

-- AlterTable
ALTER TABLE "FeePayment" DROP COLUMN "collectedById",
ADD COLUMN     "collectedByName" TEXT;

-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "name",
DROP COLUMN "surname",
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "wifeName" TEXT NOT NULL;
