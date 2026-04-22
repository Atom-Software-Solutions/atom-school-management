-- AddForeignKey
ALTER TABLE "results_mgt"."ReportCard" ADD CONSTRAINT "ReportCard_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."ReportCard" ADD CONSTRAINT "ReportCard_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "user_mgt"."School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
