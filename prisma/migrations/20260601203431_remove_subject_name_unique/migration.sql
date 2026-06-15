-- DropIndex
DROP INDEX "results_mgt"."Subject_school_id_name_key";

-- CreateIndex
CREATE INDEX "Subject_name_idx" ON "results_mgt"."Subject"("name");

-- CreateIndex
CREATE INDEX "Subject_code_idx" ON "results_mgt"."Subject"("code");
