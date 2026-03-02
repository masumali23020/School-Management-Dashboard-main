/*
  Warnings:

  - You are about to drop the `_ClassToSubject` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ClassToSubject" DROP CONSTRAINT "_ClassToSubject_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClassToSubject" DROP CONSTRAINT "_ClassToSubject_B_fkey";

-- DropTable
DROP TABLE "_ClassToSubject";
