-- Add school_id to Guardian table
ALTER TABLE "student_mgt"."Guardian" ADD COLUMN "school_id" TEXT;

-- Add index on school_id for Guardian
CREATE INDEX "Guardian_school_id_idx" ON "student_mgt"."Guardian"("school_id");

-- Add school_id to Payment table
ALTER TABLE "payment_mgt"."Payment" ADD COLUMN "school_id" TEXT;

-- Add index on school_id for Payment
CREATE INDEX "Payment_school_id_idx" ON "payment_mgt"."Payment"("school_id");

-- Backfill school_id for existing guardians from their associated students
UPDATE "student_mgt"."Guardian" g
SET school_id = (
  SELECT s.school_id 
  FROM "student_mgt"."StudentGuardian" sg
  JOIN "student_mgt"."Student" s ON sg.student_id = s.id
  WHERE sg.guardian_id = g.id
  LIMIT 1
)
WHERE g.school_id IS NULL;

-- Make school_id NOT NULL for Guardian (after backfill)
ALTER TABLE "student_mgt"."Guardian" ALTER COLUMN "school_id" SET NOT NULL;

-- Note: Payment school_id will need to be backfilled separately based on your business logic
-- For now, we'll leave it nullable. You may want to:
-- 1. Backfill from user_id -> SchoolAdmin relationship
-- 2. Or set it when creating payments
-- ALTER TABLE "payment_mgt"."Payment" ALTER COLUMN "school_id" SET NOT NULL;

