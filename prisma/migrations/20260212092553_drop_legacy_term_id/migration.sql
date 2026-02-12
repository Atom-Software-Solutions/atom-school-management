/*
  Warnings:

  - You are about to drop the column `term_id` on the `Assessment` table. All the data in the column will be lost.
  - Added the required column `classroom_definition_id` to the `Assessment` table without a default value. This is not possible if the table is not empty.
  - Made the column `term_name` on table `ReportCard` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "results_mgt"."Assessment" DROP COLUMN "term_id",
ADD COLUMN     "classroom_definition_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "results_mgt"."ReportCard" ALTER COLUMN "term_name" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Assessment_classroom_definition_id_idx" ON "results_mgt"."Assessment"("classroom_definition_id");

-- AddForeignKey
ALTER TABLE "results_mgt"."Assessment" ADD CONSTRAINT "Assessment_classroom_definition_id_fkey" FOREIGN KEY ("classroom_definition_id") REFERENCES "results_mgt"."ClassroomDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
