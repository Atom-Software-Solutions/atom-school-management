/*
  Warnings:

  - Made the column `is_primary` on table `StudentGuardian` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "student_mgt"."StudentGuardian"
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

ALTER TABLE "student_mgt"."StudentGuardian" ALTER COLUMN "is_primary" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_guardian_per_student
ON "student_mgt"."StudentGuardian"(student_id)
WHERE is_primary = true;
