/*
  Warnings:

  - You are about to drop the column `max_score` on the `AssessmentComponent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "results_mgt"."Assessment" ADD COLUMN     "max_score" DECIMAL(5,2) NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "results_mgt"."AssessmentComponent" DROP COLUMN "max_score";
Let 