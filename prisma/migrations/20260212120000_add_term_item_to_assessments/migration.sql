-- Add term_template_item_id to Assessment and ReportCard, then remove term_name
-- Guarded for shadow DB / idempotency
BEGIN;

-- Add column to Assessment if it does not exist
ALTER TABLE IF EXISTS results_mgt."Assessment" ADD COLUMN IF NOT EXISTS term_template_item_id text;

-- Create index on Assessment.term_template_item_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'Assessment_term_template_item_id_idx' AND n.nspname = 'results_mgt'
  ) THEN
    CREATE INDEX "Assessment_term_template_item_id_idx" ON results_mgt."Assessment" (term_template_item_id);
  END IF;
END$$;

-- Add FK constraint on Assessment.term_template_item_id -> TermTemplateItem(id) if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='results_mgt' AND table_name='TermTemplateItem') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_name='Assessment' AND constraint_name='Assessment_term_template_item_id_fkey'
    ) THEN
      ALTER TABLE results_mgt."Assessment" ADD CONSTRAINT "Assessment_term_template_item_id_fkey" FOREIGN KEY (term_template_item_id) REFERENCES results_mgt."TermTemplateItem"(id) ON DELETE RESTRICT;
    END IF;
  END IF;
END$$;

-- Drop legacy term_name column from Assessment
ALTER TABLE IF EXISTS results_mgt."Assessment" DROP COLUMN IF EXISTS term_name;

-- ReportCard: add column
ALTER TABLE IF EXISTS results_mgt."ReportCard" ADD COLUMN IF NOT EXISTS term_template_item_id text;

-- Create index on ReportCard.term_template_item_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'ReportCard_term_template_item_id_idx' AND n.nspname = 'results_mgt'
  ) THEN
    CREATE INDEX "ReportCard_term_template_item_id_idx" ON results_mgt."ReportCard" (term_template_item_id);
  END IF;
END$$;

-- Add FK constraint on ReportCard.term_template_item_id -> TermTemplateItem(id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='results_mgt' AND table_name='TermTemplateItem') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_name='ReportCard' AND constraint_name='ReportCard_term_template_item_id_fkey'
    ) THEN
      ALTER TABLE results_mgt."ReportCard" ADD CONSTRAINT "ReportCard_term_template_item_id_fkey" FOREIGN KEY (term_template_item_id) REFERENCES results_mgt."TermTemplateItem"(id) ON DELETE RESTRICT;
    END IF;
  END IF;
END$$;

-- Drop legacy term_name column from ReportCard
ALTER TABLE IF EXISTS results_mgt."ReportCard" DROP COLUMN IF EXISTS term_name;

COMMIT;
