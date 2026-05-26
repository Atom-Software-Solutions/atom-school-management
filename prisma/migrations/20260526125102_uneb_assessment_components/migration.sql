/*
  Warnings:

  - You are about to drop the column `assessment_date` on the `Assessment` table. All the data in the column will be lost.
  - You are about to drop the column `due_date` on the `Assessment` table. All the data in the column will be lost.
  - You are about to drop the column `is_published` on the `Assessment` table. All the data in the column will be lost.
  - You are about to drop the column `max_score` on the `Assessment` table. All the data in the column will be lost.
  - You are about to drop the column `school_id` on the `Assessment` table. All the data in the column will be lost.
  - You are about to drop the column `subject_id` on the `Assessment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[component_id,name,academic_year_id,term]` on the table `Assessment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `component_id` to the `Assessment` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Assessment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "results_mgt"."ComponentType" AS ENUM ('WRITTEN', 'PRACTICAL', 'ORAL', 'COURSEWORK', 'PROJECT', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "results_mgt"."AssessmentType" AS ENUM ('CAT', 'MIDTERM', 'END_OF_TERM', 'MOCK', 'FINAL', 'ASSIGNMENT', 'QUIZ');

-- DropForeignKey
ALTER TABLE "results_mgt"."Assessment" DROP CONSTRAINT "Assessment_academic_year_id_fkey";

-- DropForeignKey
ALTER TABLE "results_mgt"."Assessment" DROP CONSTRAINT "Assessment_classroom_definition_id_fkey";

-- DropForeignKey
ALTER TABLE "results_mgt"."Assessment" DROP CONSTRAINT "Assessment_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "results_mgt"."Assessment" DROP CONSTRAINT "Assessment_term_template_item_id_fkey";

-- DropIndex
DROP INDEX "results_mgt"."Assessment_is_published_idx";

-- DropIndex
DROP INDEX "results_mgt"."Assessment_school_id_idx";

-- DropIndex
DROP INDEX "results_mgt"."Assessment_subject_id_idx";

-- AlterTable
ALTER TABLE "results_mgt"."Assessment" DROP COLUMN "assessment_date",
DROP COLUMN "due_date",
DROP COLUMN "is_published",
DROP COLUMN "max_score",
DROP COLUMN "school_id",
DROP COLUMN "subject_id",
ADD COLUMN     "component_id" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "term" INTEGER,
DROP COLUMN "type",
ADD COLUMN     "type" "results_mgt"."AssessmentType" NOT NULL,
ALTER COLUMN "classroom_definition_id" DROP NOT NULL,
ALTER COLUMN "term_template_item_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_mgt"."Session" ADD COLUMN     "location" TEXT;

-- CreateTable
CREATE TABLE "results_mgt"."AssessmentComponent" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "results_mgt"."ComponentType" NOT NULL,
    "max_score" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_mgt"."StudentResult" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "grade" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentComponent_subject_id_idx" ON "results_mgt"."AssessmentComponent"("subject_id");

-- CreateIndex
CREATE INDEX "AssessmentComponent_type_idx" ON "results_mgt"."AssessmentComponent"("type");

-- CreateIndex
CREATE INDEX "StudentResult_student_id_idx" ON "results_mgt"."StudentResult"("student_id");

-- CreateIndex
CREATE INDEX "StudentResult_assessment_id_idx" ON "results_mgt"."StudentResult"("assessment_id");

-- CreateIndex
CREATE INDEX "Assessment_component_id_idx" ON "results_mgt"."Assessment"("component_id");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_component_id_name_academic_year_id_term_key" ON "results_mgt"."Assessment"("component_id", "name", "academic_year_id", "term");

-- AddForeignKey
ALTER TABLE "results_mgt"."AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "results_mgt"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."Assessment" ADD CONSTRAINT "Assessment_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "results_mgt"."AssessmentComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."Assessment" ADD CONSTRAINT "Assessment_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "results_mgt"."AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."Assessment" ADD CONSTRAINT "Assessment_term_template_item_id_fkey" FOREIGN KEY ("term_template_item_id") REFERENCES "results_mgt"."TermTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."Assessment" ADD CONSTRAINT "Assessment_classroom_definition_id_fkey" FOREIGN KEY ("classroom_definition_id") REFERENCES "results_mgt"."ClassroomDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."StudentResult" ADD CONSTRAINT "StudentResult_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "results_mgt"."Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."StudentResult" ADD CONSTRAINT "StudentResult_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
