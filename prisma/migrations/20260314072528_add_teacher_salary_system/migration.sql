-- CreateTable
CREATE TABLE "TeacherSalaryStructure" (
    "id" SERIAL NOT NULL,
    "teacherId" TEXT NOT NULL,
    "salaryTypeId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSalaryPayment" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "salaryTypeId" INTEGER NOT NULL,
    "salaryStructureId" INTEGER,
    "amountPaid" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "academicYear" TEXT NOT NULL,
    "monthLabel" TEXT,
    "remarks" TEXT,
    "collectedBy" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherSalaryStructure_teacherId_idx" ON "TeacherSalaryStructure"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSalaryStructure_salaryTypeId_idx" ON "TeacherSalaryStructure"("salaryTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSalaryStructure_teacherId_salaryTypeId_key" ON "TeacherSalaryStructure"("teacherId", "salaryTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSalaryPayment_invoiceNumber_key" ON "TeacherSalaryPayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "TeacherSalaryPayment_teacherId_idx" ON "TeacherSalaryPayment"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSalaryPayment_salaryTypeId_idx" ON "TeacherSalaryPayment"("salaryTypeId");

-- CreateIndex
CREATE INDEX "TeacherSalaryPayment_salaryStructureId_idx" ON "TeacherSalaryPayment"("salaryStructureId");

-- CreateIndex
CREATE INDEX "TeacherSalaryPayment_academicYear_idx" ON "TeacherSalaryPayment"("academicYear");

-- CreateIndex
CREATE INDEX "TeacherSalaryPayment_paidAt_idx" ON "TeacherSalaryPayment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryType_name_key" ON "SalaryType"("name");

-- AddForeignKey
ALTER TABLE "TeacherSalaryStructure" ADD CONSTRAINT "TeacherSalaryStructure_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalaryStructure" ADD CONSTRAINT "TeacherSalaryStructure_salaryTypeId_fkey" FOREIGN KEY ("salaryTypeId") REFERENCES "SalaryType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalaryPayment" ADD CONSTRAINT "TeacherSalaryPayment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalaryPayment" ADD CONSTRAINT "TeacherSalaryPayment_salaryTypeId_fkey" FOREIGN KEY ("salaryTypeId") REFERENCES "SalaryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalaryPayment" ADD CONSTRAINT "TeacherSalaryPayment_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "TeacherSalaryStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
