-- AlterTable (guarded)
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'student_mgt' AND table_name = 'Student' AND column_name = 'date_of_birth'
	) THEN
		EXECUTE 'ALTER TABLE "student_mgt"."Student" ALTER COLUMN "date_of_birth" SET DATA TYPE TIMESTAMP(3)';
	END IF;
END$$;
