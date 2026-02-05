/*
  Warnings:

  - Made the column `ordinal` on table `ClassroomDefinition` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "results_mgt"."ClassroomDefinition" ALTER COLUMN "ordinal" SET NOT NULL,
ALTER COLUMN "ordinal" SET DEFAULT 0;
