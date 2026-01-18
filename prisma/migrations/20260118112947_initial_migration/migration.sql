-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "results_mgt";

-- CreateTable
CREATE TABLE "results_mgt"."Subject" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_mgt"."Assessment" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "max_score" DECIMAL(5,2) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "assessment_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_mgt"."Grade" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "letter_grade" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_mgt"."ReportCard" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "overall_average" DECIMAL(5,2),
    "total_subjects" INTEGER,
    "rank" INTEGER,
    "total_students" INTEGER,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "generated_by" TEXT,
    "pdf_url" TEXT,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subject_school_id_idx" ON "results_mgt"."Subject"("school_id");

-- CreateIndex
CREATE INDEX "Subject_is_active_idx" ON "results_mgt"."Subject"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_school_id_name_key" ON "results_mgt"."Subject"("school_id", "name");

-- CreateIndex
CREATE INDEX "Assessment_school_id_idx" ON "results_mgt"."Assessment"("school_id");

-- CreateIndex
CREATE INDEX "Assessment_term_id_idx" ON "results_mgt"."Assessment"("term_id");

-- CreateIndex
CREATE INDEX "Assessment_subject_id_idx" ON "results_mgt"."Assessment"("subject_id");

-- CreateIndex
CREATE INDEX "Assessment_is_published_idx" ON "results_mgt"."Assessment"("is_published");

-- CreateIndex
CREATE INDEX "Grade_school_id_idx" ON "results_mgt"."Grade"("school_id");

-- CreateIndex
CREATE INDEX "Grade_student_id_idx" ON "results_mgt"."Grade"("student_id");

-- CreateIndex
CREATE INDEX "Grade_assessment_id_idx" ON "results_mgt"."Grade"("assessment_id");

-- CreateIndex
CREATE INDEX "Grade_subject_id_idx" ON "results_mgt"."Grade"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_student_id_assessment_id_key" ON "results_mgt"."Grade"("student_id", "assessment_id");

-- CreateIndex
CREATE INDEX "ReportCard_school_id_idx" ON "results_mgt"."ReportCard"("school_id");

-- CreateIndex
CREATE INDEX "ReportCard_student_id_idx" ON "results_mgt"."ReportCard"("student_id");

-- CreateIndex
CREATE INDEX "ReportCard_academic_year_id_idx" ON "results_mgt"."ReportCard"("academic_year_id");

-- CreateIndex
CREATE INDEX "ReportCard_term_id_idx" ON "results_mgt"."ReportCard"("term_id");

-- CreateIndex
CREATE INDEX "ReportCard_status_idx" ON "results_mgt"."ReportCard"("status");

-- AddForeignKey
ALTER TABLE "results_mgt"."Assessment" ADD CONSTRAINT "Assessment_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "results_mgt"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."Grade" ADD CONSTRAINT "Grade_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "results_mgt"."Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."Grade" ADD CONSTRAINT "Grade_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "results_mgt"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
