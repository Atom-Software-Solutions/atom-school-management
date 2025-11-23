-- Drop existing global unique constraints on student_no and reg_no
DROP INDEX IF EXISTS "student_mgt"."Student_student_no_key";
DROP INDEX IF EXISTS "student_mgt"."Student_reg_no_key";

-- Create tenant-scoped composite unique constraints
-- This allows different schools to have students with the same student_no or reg_no
CREATE UNIQUE INDEX "Student_school_id_student_no_key" ON "student_mgt"."Student"("school_id", "student_no");

-- Note: reg_no is nullable, so we use a partial unique index
-- This ensures uniqueness per school only when reg_no is not null
CREATE UNIQUE INDEX "Student_school_id_reg_no_key" ON "student_mgt"."Student"("school_id", "reg_no") 
WHERE "reg_no" IS NOT NULL;
