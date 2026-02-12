/*
  Warnings:

  - Made the column `ordinal` on table `ClassroomDefinition` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable (guarded)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'results_mgt' AND table_name = 'ClassroomDefinition' AND column_name = 'ordinal'
  ) THEN
    EXECUTE 'ALTER TABLE "results_mgt"."ClassroomDefinition" ALTER COLUMN "ordinal" SET DEFAULT 0';
    EXECUTE 'ALTER TABLE "results_mgt"."ClassroomDefinition" ALTER COLUMN "ordinal" SET NOT NULL';
  END IF;
END$$;
