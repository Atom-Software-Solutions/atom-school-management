-- Manual migration: migrate student_enrollment to reference classroom_definition instead of classroom_offering
-- NOTE: Review and run in a safe migration environment (test/staging) before applying to production.

BEGIN;

-- 1) Add new column to hold classroom_definition reference
ALTER TABLE results_mgt.student_enrollment ADD COLUMN classroom_definition_id uuid;

-- 2) Backfill from existing classroom_offering relation
UPDATE results_mgt.student_enrollment se
SET classroom_definition_id = (
  SELECT co.classroom_definition_id FROM results_mgt.classroom_offering co WHERE co.id = se.classroom_offering_id
)
WHERE se.classroom_offering_id IS NOT NULL;

-- 3) Add new columns
ALTER TABLE results_mgt.student_enrollment ADD COLUMN type text;
ALTER TABLE results_mgt.student_enrollment ADD COLUMN reason text;
ALTER TABLE results_mgt.student_enrollment ADD COLUMN deleted_at timestamptz;

-- 4) Create FK constraint to classroom_definition
ALTER TABLE results_mgt.student_enrollment
  ADD CONSTRAINT student_enrollment_classroom_definition_fkey FOREIGN KEY (classroom_definition_id)
  REFERENCES results_mgt.classroom_definition (id) ON DELETE RESTRICT;

-- 5) Create index on classroom_definition_id
CREATE INDEX IF NOT EXISTS idx_student_enrollment_classroom_definition_id ON results_mgt.student_enrollment (classroom_definition_id);

-- 6) Optional: drop the old column (keep commented until validated)
-- ALTER TABLE results_mgt.student_enrollment DROP COLUMN classroom_offering_id;

COMMIT;

-- Rollback (if needed): reverse the steps (manual verification required)