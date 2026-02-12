-- Add academic_year_id and term_name columns (guarded)
ALTER TABLE IF EXISTS "results_mgt"."Assessment" ADD COLUMN IF NOT EXISTS "academic_year_id" TEXT;
ALTER TABLE IF EXISTS "results_mgt"."Assessment" ADD COLUMN IF NOT EXISTS "term_name" TEXT;

-- Backfill academic_year_id and term_name from Term table (if Term exists and mapping data is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='results_mgt' AND table_name='Term') THEN
    UPDATE results_mgt."Assessment" a
    SET
      academic_year_id = COALESCE(t.academic_year_id, ''),
      term_name = COALESCE(t.name, '')
    FROM results_mgt."Term" t
    WHERE a.term_id = t.id AND (a.academic_year_id IS NULL OR a.academic_year_id = '');
  END IF;
END$$;

-- Add foreign key constraint for academic_year_id (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='results_mgt' AND table_name='Assessment' AND column_name='academic_year_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc WHERE tc.table_name='Assessment' AND tc.constraint_type='FOREIGN KEY' AND tc.constraint_name='Assessment_academic_year_id_fkey'
    ) THEN
      ALTER TABLE results_mgt."Assessment"
      ADD CONSTRAINT "Assessment_academic_year_id_fkey"
      FOREIGN KEY ("academic_year_id") REFERENCES "results_mgt"."AcademicYear"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END$$;

-- Add indexes for new columns (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'Assessment_academic_year_id_idx' AND n.nspname = 'results_mgt') THEN
    CREATE INDEX "Assessment_academic_year_id_idx" ON results_mgt."Assessment"("academic_year_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'Assessment_term_name_idx' AND n.nspname = 'results_mgt') THEN
    CREATE INDEX "Assessment_term_name_idx" ON results_mgt."Assessment"("term_name");
  END IF;
END$$;
-- Update ReportCard: Replace term_id with term_name

-- Backfill term_name from Term table before dropping term_id
-- Ensure `term_name` column exists on ReportCard, then backfill from Term table before dropping term_id
ALTER TABLE IF EXISTS "results_mgt"."ReportCard" ADD COLUMN IF NOT EXISTS "term_name" TEXT;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='results_mgt' AND table_name='Term') THEN
    UPDATE results_mgt."ReportCard" rc
    SET term_name = COALESCE(t.name, '')
    FROM results_mgt."Term" t
    WHERE rc.term_id = t.id AND (rc.term_name IS NULL OR rc.term_name = '');
  END IF;
END$$;

ALTER TABLE IF EXISTS "results_mgt"."ReportCard" DROP CONSTRAINT IF EXISTS "ReportCard_term_id_fkey";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'ReportCard_term_id_idx' AND n.nspname = 'results_mgt') THEN
    EXECUTE 'DROP INDEX results_mgt."ReportCard_term_id_idx"';
  END IF;
END$$;
ALTER TABLE IF EXISTS "results_mgt"."ReportCard" DROP COLUMN IF EXISTS "term_id";

-- Add index for new term_name column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'ReportCard_term_name_idx' AND n.nspname = 'results_mgt') THEN
    CREATE INDEX "ReportCard_term_name_idx" ON results_mgt."ReportCard"("term_name");
  END IF;
END$$;