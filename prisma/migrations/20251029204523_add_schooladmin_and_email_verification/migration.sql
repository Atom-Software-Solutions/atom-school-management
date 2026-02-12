/*
  Warnings:

  - You are about to drop the column `school_id` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[verification_token]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "user_mgt"."User" DROP CONSTRAINT IF EXISTS "User_school_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "user_mgt"."User_school_id_idx";

-- AlterTable
ALTER TABLE "user_mgt"."User" DROP COLUMN IF EXISTS "school_id",
ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "verification_token" TEXT;

-- CreateTable
CREATE TABLE "user_mgt"."SchoolAdmin" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolAdmin_school_id_idx" ON "user_mgt"."SchoolAdmin"("school_id");

-- CreateIndex
CREATE INDEX "SchoolAdmin_user_id_idx" ON "user_mgt"."SchoolAdmin"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAdmin_school_id_user_id_key" ON "user_mgt"."SchoolAdmin"("school_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_verification_token_key" ON "user_mgt"."User"("verification_token");

-- CreateIndex
CREATE INDEX "User_verification_token_idx" ON "user_mgt"."User"("verification_token");

-- AddForeignKey
ALTER TABLE "user_mgt"."SchoolAdmin" ADD CONSTRAINT "SchoolAdmin_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "user_mgt"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mgt"."SchoolAdmin" ADD CONSTRAINT "SchoolAdmin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_mgt"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
