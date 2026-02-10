-- Add academic_year_id and term_name columns to assessments
ALTER TABLE "results_mgt"."Assessment" ADD COLUMN "academic_year_id" TEXT;
ALTER TABLE "results_mgt"."Assessment" ADD COLUMN "term_name" TEXT;

-- Backfill from existing term_id by joining to Term table
UPDATE "results_mgt"."Assessment" a
SET 
  "academic_year_id" = t."academic_year_id",
  "term_name" = t."name"
FROM "results_mgt"."Term" t
WHERE a."term_id" = t."id";

-- Make columns NOT NULL (after backfill succeeds)
ALTER TABLE "results_mgt"."Assessment" 
ALTER COLUMN "academic_year_id" SET NOT NULL,
ALTER COLUMN "term_name" SET NOT NULL;

-- Add indexes for new columns
CREATE INDEX "Assessment_academic_year_id_idx" ON "results_mgt"."Assessment"("academic_year_id");
CREATE INDEX "Assessment_term_name_idx" ON "results_mgt"."Assessment"("term_name");

-- Optional: Mark term_id as deprecated by making it nullable (it's still used for reference)
-- Note: term_id remains NOT NULL for now to avoid breaking existing code, but future code should use academic_year_id + term_name
