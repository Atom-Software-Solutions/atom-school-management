-- CreateEnum
CREATE TYPE "user_mgt"."InstitutionType" AS ENUM ('PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'UNIVERSITY');

-- AlterTable
ALTER TABLE "user_mgt"."School" ADD COLUMN     "institution_type" "user_mgt"."InstitutionType" NOT NULL DEFAULT 'PRIMARY_SCHOOL';
