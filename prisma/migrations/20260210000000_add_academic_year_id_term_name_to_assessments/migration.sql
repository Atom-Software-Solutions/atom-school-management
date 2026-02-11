-- Remove term_id FK and drop the column
ALTER TABLE "results_mgt"."Assessment" DROP CONSTRAINT IF EXISTS "Assessment_term_id_fkey";
DROP INDEX IF EXISTS "results_mgt"."Assessment_term_id_idx";
ALTER TABLE "results_mgt"."Assessment" DROP COLUMN IF EXISTS "term_id";

-- Add academic_year_id and term_name columns
ALTER TABLE "results_mgt"."Assessment" ADD COLUMN "academic_year_id" TEXT NOT NULL;
ALTER TABLE "results_mgt"."Assessment" ADD COLUMN "term_name" TEXT NOT NULL;

-- Add foreign key constraint for academic_year_id
ALTER TABLE "results_mgt"."Assessment" 
ADD CONSTRAINT "Assessment_academic_year_id_fkey" 
FOREIGN KEY ("academic_year_id") REFERENCES "results_mgt"."AcademicYear"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill academic_year_id and term_name from Term table (if data exists)
UPDATE "results_mgt"."Assessment" a
SET 
  "academic_year_id" = COALESCE(t."academic_year_id", ''),
  "term_name" = COALESCE(t."name", '')
FROM "results_mgt"."Term" t
WHERE a."term_id" = t."id" AND a."academic_year_id" IS NULL;

-- Add indexes for new columns
CREATE INDEX "Assessment_academic_year_id_idx" ON "results_mgt"."Assessment"("academic_year_id");
CREATE INDEX "Assessment_term_name_idx" ON "results_mgt"."Assessment"("term_name");
-- Update ReportCard: Replace term_id with term_name
ALTER TABLE "results_mgt"."ReportCard" DROP CONSTRAINT IF EXISTS "ReportCard_term_id_fkey";
DROP INDEX IF EXISTS "results_mgt"."ReportCard_term_id_idx";

-- Backfill term_name from Term table before dropping term_id
UPDATE "results_mgt"."ReportCard" rc
SET "term_name" = COALESCE(t."name", '')
FROM "results_mgt"."Term" t
WHERE rc."term_id" = t."id" AND rc."term_name" IS NULL;

ALTER TABLE "results_mgt"."ReportCard" DROP COLUMN IF EXISTS "term_id";

-- Add index for new term_name column
CREATE INDEX "ReportCard_term_name_idx" ON "results_mgt"."ReportCard"("term_name");