-- AlterTable
ALTER TABLE "user_mgt"."School" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "School_deleted_at_idx" ON "user_mgt"."School"("deleted_at");
