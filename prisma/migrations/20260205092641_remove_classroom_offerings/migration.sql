/*
  Warnings:

  - You are about to drop the column `classroom_offering_id` on the `StudentEnrollment` table. All the data in the column will be lost.
  - You are about to drop the `ClassroomOffering` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `classroom_definition_id` to the `StudentEnrollment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "results_mgt"."ClassroomOffering" DROP CONSTRAINT IF EXISTS "ClassroomOffering_academic_year_id_fkey";

-- DropForeignKey
ALTER TABLE "results_mgt"."ClassroomOffering" DROP CONSTRAINT IF EXISTS "ClassroomOffering_classroom_definition_id_fkey";

-- DropForeignKey
ALTER TABLE "results_mgt"."StudentEnrollment" DROP CONSTRAINT IF EXISTS "StudentEnrollment_classroom_offering_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "results_mgt"."StudentEnrollment_classroom_offering_id_idx";

-- AlterTable
ALTER TABLE "results_mgt"."ClassroomDefinition" ADD COLUMN     "ordinal" INTEGER;

-- AlterTable
ALTER TABLE "results_mgt"."StudentEnrollment" DROP COLUMN IF EXISTS "classroom_offering_id",
ADD COLUMN     "classroom_definition_id" TEXT NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "type" TEXT;

-- DropTable
DROP TABLE IF EXISTS "results_mgt"."ClassroomOffering";

-- CreateIndex
CREATE INDEX "ClassroomDefinition_ordinal_idx" ON "results_mgt"."ClassroomDefinition"("ordinal");

-- CreateIndex
CREATE INDEX "StudentEnrollment_classroom_definition_id_idx" ON "results_mgt"."StudentEnrollment"("classroom_definition_id");

-- AddForeignKey
ALTER TABLE "results_mgt"."StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classroom_definition_id_fkey" FOREIGN KEY ("classroom_definition_id") REFERENCES "results_mgt"."ClassroomDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
