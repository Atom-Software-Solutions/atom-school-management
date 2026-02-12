-- Safe drop for Term table in results_mgt
-- 1) Drop FK/index references to Term from other tables (if any)
ALTER TABLE IF EXISTS "results_mgt"."Assessment" DROP CONSTRAINT IF EXISTS "Assessment_term_id_fkey";
DROP INDEX IF EXISTS "results_mgt"."Assessment_term_id_idx";

ALTER TABLE IF EXISTS "results_mgt"."ReportCard" DROP CONSTRAINT IF EXISTS "ReportCard_term_id_fkey";
DROP INDEX IF EXISTS "results_mgt"."ReportCard_term_id_idx";

-- 2) (Optional) If any other tables reference Term, drop their constraints here.

-- 3) Finally drop the Term table. CASCADE to ensure dependent objects are removed.
DROP TABLE IF EXISTS "results_mgt"."Term" CASCADE;

-- NOTE: Ensure you have backfilled any required term_name/academic_year_id values
-- (assessments and report cards should already contain academic_year_id + term_name)
-- before running this migration in production. Run on a staging DB first.
