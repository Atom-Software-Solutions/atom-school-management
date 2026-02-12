-- DropIndex
DROP INDEX IF EXISTS "results_mgt"."Assessment_term_id_idx";

-- AlterTable
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'results_mgt' AND table_name = 'Assessment' AND column_name = 'term_id'
	) THEN
		EXECUTE 'ALTER TABLE "results_mgt"."Assessment" ALTER COLUMN "term_id" DROP NOT NULL';
	END IF;
END$$;
