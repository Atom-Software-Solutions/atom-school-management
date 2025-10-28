/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `School` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `School` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_mgt"."School" ADD COLUMN     "address" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'UGX',
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "time_zone" TEXT NOT NULL DEFAULT 'Africa/Kampala';

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "user_mgt"."School"("code");

-- CreateIndex
CREATE INDEX "School_code_idx" ON "user_mgt"."School"("code");
