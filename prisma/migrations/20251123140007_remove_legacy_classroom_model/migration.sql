-- Migration: Remove Legacy Classroom Model
-- 
-- IMPORTANT: Run the data migration script BEFORE applying this migration:
--   npx ts-node scripts/migrate-classroom-to-definition.ts
--
-- This migration removes:
-- 1. Student.class_id column and foreign key
-- 2. Classroom table

-- DropForeignKey
ALTER TABLE "student_mgt"."Student" DROP CONSTRAINT IF EXISTS "Student_class_id_fkey";

-- AlterTable
ALTER TABLE "student_mgt"."Student" DROP COLUMN IF EXISTS "class_id";

-- DropTable
DROP TABLE IF EXISTS "student_mgt"."Classroom";
