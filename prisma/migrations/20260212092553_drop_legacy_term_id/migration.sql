/*
  Warnings:

  - You are about to drop the column `term_id` on the `Assessment` table. All the data in the column will be lost.
  - Added the required column `classroom_definition_id` to the `Assessment` table without a default value. This is not possible if the table is not empty.
  - Made the column `term_name` on table `ReportCard` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable: safely add classroom_definition_id if missing and drop term_id if exists
ALTER TABLE IF EXISTS "results_mgt"."Assessment" DROP COLUMN IF EXISTS "term_id";
ALTER TABLE IF EXISTS "results_mgt"."Assessment" ADD COLUMN IF NOT EXISTS "classroom_definition_id" TEXT;

-- Only set ReportCard.term_name NOT NULL if column exists and contains no NULLs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='results_mgt' AND table_name='ReportCard' AND column_name='term_name') THEN
    IF (SELECT COUNT(*) FROM results_mgt."ReportCard" WHERE term_name IS NULL) = 0 THEN
      ALTER TABLE "results_mgt"."ReportCard" ALTER COLUMN "term_name" SET NOT NULL;
    END IF;
  END IF;
END$$;

-- CreateIndex for classroom_definition_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'Assessment_classroom_definition_id_idx' AND n.nspname = 'results_mgt') THEN
    CREATE INDEX "Assessment_classroom_definition_id_idx" ON "results_mgt"."Assessment"("classroom_definition_id");
  END IF;
END$$;

-- AddForeignKey for classroom_definition_id if the column exists and constraint missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='results_mgt' AND table_name='Assessment' AND column_name='classroom_definition_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc WHERE tc.table_name='Assessment' AND tc.constraint_name='Assessment_classroom_definition_id_fkey'
    ) THEN
      ALTER TABLE "results_mgt"."Assessment" ADD CONSTRAINT "Assessment_classroom_definition_id_fkey" FOREIGN KEY ("classroom_definition_id") REFERENCES "results_mgt"."ClassroomDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END$$;
