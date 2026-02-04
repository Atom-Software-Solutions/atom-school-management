-- Manual migration: migrate student_enrollment to reference classroom_definition instead of classroom_offering
-- NOTE: Review and run in a safe migration environment (test/staging) before applying to production.

BEGIN;

ALTER TABLE "results_mgt"."StudentEnrollment" ADD COLUMN "classroom_definition_id" uuid;

UPDATE "results_mgt"."StudentEnrollment" se
SET "classroom_definition_id" = (
  SELECT co.classroom_definition_id FROM "results_mgt"."ClassroomOffering" co WHERE co.id = se.classroom_offering_id
)
WHERE se.classroom_offering_id IS NOT NULL;

ALTER TABLE "results_mgt"."StudentEnrollment" ADD COLUMN "type" text;
ALTER TABLE "results_mgt"."StudentEnrollment" ADD COLUMN "reason" text;
ALTER TABLE "results_mgt"."StudentEnrollment" ADD COLUMN "deleted_at" timestamptz;

ALTER TABLE "results_mgt"."StudentEnrollment"
  ADD CONSTRAINT student_enrollment_classroom_definition_fkey FOREIGN KEY ("classroom_definition_id")
    REFERENCES "results_mgt"."ClassroomDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_student_enrollment_classroom_definition_id ON "results_mgt"."StudentEnrollment" ("classroom_definition_id");

-- 6) Optional: drop the old column (keep commented until validated)
-- ALTER TABLE results_mgt.student_enrollment DROP COLUMN classroom_offering_id;

COMMIT;

-- Rollback (if needed): reverse the steps (manual verification required)