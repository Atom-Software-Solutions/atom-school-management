-- Manual migration: ensure a student cannot have more than one pending/active enrollment per academic year
-- Run this against your PostgreSQL DB in the `results_mgt` schema

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_enrollment_per_student_year
ON results_mgt.student_enrollment (student_id, academic_year_id)
WHERE deleted_at IS NULL AND status IN ('pending','active');

-- To rollback:
-- DROP INDEX IF EXISTS results_mgt.unique_active_enrollment_per_student_year;