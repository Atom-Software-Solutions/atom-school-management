/*
  Warnings:

  - A unique constraint covering the columns `[school_id,first_name,last_name,date_of_birth]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - Made the column `date_of_birth` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable (guarded)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'student_mgt' AND table_name = 'Student' AND column_name = 'date_of_birth'
  ) THEN
    EXECUTE 'ALTER TABLE "student_mgt"."Student" ALTER COLUMN "date_of_birth" SET NOT NULL';
  END IF;
END$$;

CREATE UNIQUE INDEX "Student_school_id_first_name_last_name_date_of_birth_key" ON "student_mgt"."Student"("school_id", "first_name", "last_name", "date_of_birth");
