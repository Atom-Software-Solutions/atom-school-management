-- Add school_id to Guardian table
ALTER TABLE "student_mgt"."Guardian" ADD COLUMN "school_id" TEXT;

-- Add index on school_id for Guardian
CREATE INDEX "Guardian_school_id_idx" ON "student_mgt"."Guardian"("school_id");

-- Add school_id to Payment table
ALTER TABLE "payment_mgt"."Payment" ADD COLUMN "school_id" TEXT;

-- Add index on school_id for Payment
CREATE INDEX "Payment_school_id_idx" ON "payment_mgt"."Payment"("school_id");

UPDATE "student_mgt"."Guardian" g
SET school_id = (
  SELECT s.school_id 
  FROM "student_mgt"."StudentGuardian" sg
  JOIN "student_mgt"."Student" s ON sg.student_id = s.id
  WHERE sg.guardian_id = g.id
  LIMIT 1
)
WHERE g.school_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'student_mgt' AND table_name = 'Guardian' AND column_name = 'school_id'
  ) THEN
    EXECUTE 'ALTER TABLE "student_mgt"."Guardian" ALTER COLUMN "school_id" SET NOT NULL';
  END IF;
END$$;


