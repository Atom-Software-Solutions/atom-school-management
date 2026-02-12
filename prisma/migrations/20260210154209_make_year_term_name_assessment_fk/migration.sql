-- DropIndex
DROP INDEX "results_mgt"."Assessment_term_id_idx";

-- AlterTable
ALTER TABLE "results_mgt"."Assessment" ALTER COLUMN "term_id" DROP NOT NULL;
