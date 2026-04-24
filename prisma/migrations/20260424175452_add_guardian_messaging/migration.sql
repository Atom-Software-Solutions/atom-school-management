/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Guardian` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Guardian` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "student_mgt"."GuardianMessage" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "student_id" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuardianMessage_school_id_idx" ON "student_mgt"."GuardianMessage"("school_id");

-- CreateIndex
CREATE INDEX "GuardianMessage_guardian_id_idx" ON "student_mgt"."GuardianMessage"("guardian_id");

-- CreateIndex
CREATE INDEX "GuardianMessage_student_id_idx" ON "student_mgt"."GuardianMessage"("student_id");

-- CreateIndex
CREATE INDEX "GuardianMessage_status_idx" ON "student_mgt"."GuardianMessage"("status");

-- CreateIndex
CREATE INDEX "GuardianMessage_type_idx" ON "student_mgt"."GuardianMessage"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_email_key" ON "student_mgt"."Guardian"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_phone_key" ON "student_mgt"."Guardian"("phone");

-- AddForeignKey
ALTER TABLE "student_mgt"."GuardianMessage" ADD CONSTRAINT "GuardianMessage_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "student_mgt"."Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_mgt"."GuardianMessage" ADD CONSTRAINT "GuardianMessage_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
