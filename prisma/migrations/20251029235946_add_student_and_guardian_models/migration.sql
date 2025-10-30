/*
  Warnings:

  - Added the required column `domain` to the `School` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_mgt"."School" ADD COLUMN     "domain" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "user_mgt"."Student" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mgt"."Guardian" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mgt"."StudentGuardian" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "relation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Student_school_id_idx" ON "user_mgt"."Student"("school_id");

-- CreateIndex
CREATE INDEX "Student_deleted_at_idx" ON "user_mgt"."Student"("deleted_at");

-- CreateIndex
CREATE INDEX "StudentGuardian_student_id_idx" ON "user_mgt"."StudentGuardian"("student_id");

-- CreateIndex
CREATE INDEX "StudentGuardian_guardian_id_idx" ON "user_mgt"."StudentGuardian"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_student_id_guardian_id_key" ON "user_mgt"."StudentGuardian"("student_id", "guardian_id");

-- AddForeignKey
ALTER TABLE "user_mgt"."Student" ADD CONSTRAINT "Student_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "user_mgt"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mgt"."StudentGuardian" ADD CONSTRAINT "StudentGuardian_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user_mgt"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mgt"."StudentGuardian" ADD CONSTRAINT "StudentGuardian_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "user_mgt"."Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
