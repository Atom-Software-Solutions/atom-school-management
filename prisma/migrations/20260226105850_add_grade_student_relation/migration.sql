/*
  Warnings:

  - Made the column `academic_year_id` on table `Assessment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `classroom_definition_id` on table `Assessment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `term_template_item_id` on table `Assessment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `term_template_item_id` on table `ReportCard` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "results_mgt"."Assessment" DROP CONSTRAINT "Assessment_term_template_item_id_fkey";

-- DropForeignKey
ALTER TABLE "results_mgt"."ReportCard" DROP CONSTRAINT "ReportCard_term_template_item_id_fkey";

-- AlterTable
ALTER TABLE "results_mgt"."Assessment" ALTER COLUMN "academic_year_id" SET NOT NULL,
ALTER COLUMN "classroom_definition_id" SET NOT NULL,
ALTER COLUMN "term_template_item_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "results_mgt"."ReportCard" ALTER COLUMN "term_template_item_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "results_mgt"."TermTemplateItem" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "results_mgt"."Assessment" ADD CONSTRAINT "Assessment_term_template_item_id_fkey" FOREIGN KEY ("term_template_item_id") REFERENCES "results_mgt"."TermTemplateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."Grade" ADD CONSTRAINT "Grade_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."ReportCard" ADD CONSTRAINT "ReportCard_term_template_item_id_fkey" FOREIGN KEY ("term_template_item_id") REFERENCES "results_mgt"."TermTemplateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
