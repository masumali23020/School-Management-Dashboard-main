-- CreateTable
CREATE TABLE "ExamPublish" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "session" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPublish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamPublish_examId_classId_session_key" ON "ExamPublish"("examId", "classId", "session");

-- AddForeignKey
ALTER TABLE "ExamPublish" ADD CONSTRAINT "ExamPublish_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPublish" ADD CONSTRAINT "ExamPublish_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
