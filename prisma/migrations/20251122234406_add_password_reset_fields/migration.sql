-- AlterTable
ALTER TABLE "user_mgt"."User" ADD COLUMN     "password_reset_token" TEXT,
ADD COLUMN     "password_reset_expires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_password_reset_token_key" ON "user_mgt"."User"("password_reset_token");

-- CreateIndex
CREATE INDEX "User_password_reset_token_idx" ON "user_mgt"."User"("password_reset_token");

