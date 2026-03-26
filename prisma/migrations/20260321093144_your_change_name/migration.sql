/*
  Warnings:

  - You are about to drop the column `collectedByName` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `collectedByName` on the `EmployeeSalaryPayment` table. All the data in the column will be lost.
  - You are about to drop the column `collectedByName` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `wifeName` on the `Parent` table. All the data in the column will be lost.
  - Added the required column `processedById` to the `EmployeeSalaryPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `collectedById` to the `FeePayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surname` to the `Parent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "collectedByName";

-- AlterTable
ALTER TABLE "EmployeeSalaryPayment" DROP COLUMN "collectedByName",
ADD COLUMN     "processedById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FeePayment" DROP COLUMN "collectedByName",
ADD COLUMN     "collectedById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "fullName",
DROP COLUMN "wifeName",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "surname" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryPayment" ADD CONSTRAINT "EmployeeSalaryPayment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
