-- AddForeignKey
ALTER TABLE "results_mgt"."StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
