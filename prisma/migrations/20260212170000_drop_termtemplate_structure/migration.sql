-- Drop TermTemplate.structure JSON column (guarded)
BEGIN;

-- Remove legacy structure column if present
ALTER TABLE IF EXISTS results_mgt."TermTemplate" DROP COLUMN IF EXISTS structure;

COMMIT;
