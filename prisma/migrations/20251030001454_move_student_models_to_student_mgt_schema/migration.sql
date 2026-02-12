/*
  Warnings:

  - You are about to drop the `Guardian` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Student` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentGuardian` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "student_mgt";

-- DropForeignKey
ALTER TABLE "user_mgt"."Student" DROP CONSTRAINT IF EXISTS "Student_school_id_fkey";

-- DropForeignKey
ALTER TABLE "user_mgt"."StudentGuardian" DROP CONSTRAINT IF EXISTS "StudentGuardian_guardian_id_fkey";

-- DropForeignKey
ALTER TABLE "user_mgt"."StudentGuardian" DROP CONSTRAINT IF EXISTS "StudentGuardian_student_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "user_mgt"."Guardian";

-- DropTable
DROP TABLE IF EXISTS "user_mgt"."Student";

-- DropTable
DROP TABLE IF EXISTS "user_mgt"."StudentGuardian";

-- CreateTable
CREATE TABLE "student_mgt"."Student" (
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
CREATE TABLE "student_mgt"."Guardian" (
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
CREATE TABLE "student_mgt"."StudentGuardian" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "relation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Student_school_id_idx" ON "student_mgt"."Student"("school_id");

-- CreateIndex
CREATE INDEX "Student_deleted_at_idx" ON "student_mgt"."Student"("deleted_at");

-- CreateIndex
CREATE INDEX "StudentGuardian_student_id_idx" ON "student_mgt"."StudentGuardian"("student_id");

-- CreateIndex
CREATE INDEX "StudentGuardian_guardian_id_idx" ON "student_mgt"."StudentGuardian"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_student_id_guardian_id_key" ON "student_mgt"."StudentGuardian"("student_id", "guardian_id");

-- AddForeignKey
ALTER TABLE "student_mgt"."StudentGuardian" ADD CONSTRAINT "StudentGuardian_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_mgt"."StudentGuardian" ADD CONSTRAINT "StudentGuardian_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "student_mgt"."Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
