-- CreateTable
CREATE TABLE "results_mgt"."TermTemplate" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_mgt"."AcademicYear" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "term_template_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_mgt"."Term" (
    "id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermTemplate_school_id_idx" ON "results_mgt"."TermTemplate"("school_id");

-- CreateIndex
CREATE INDEX "TermTemplate_is_locked_idx" ON "results_mgt"."TermTemplate"("is_locked");

-- CreateIndex
CREATE UNIQUE INDEX "TermTemplate_school_id_name_key" ON "results_mgt"."TermTemplate"("school_id", "name");

-- CreateIndex
CREATE INDEX "AcademicYear_school_id_idx" ON "results_mgt"."AcademicYear"("school_id");

-- CreateIndex
CREATE INDEX "AcademicYear_start_date_idx" ON "results_mgt"."AcademicYear"("start_date");

-- CreateIndex
CREATE INDEX "AcademicYear_end_date_idx" ON "results_mgt"."AcademicYear"("end_date");

-- CreateIndex
CREATE INDEX "AcademicYear_term_template_id_idx" ON "results_mgt"."AcademicYear"("term_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_school_id_name_key" ON "results_mgt"."AcademicYear"("school_id", "name");

-- CreateIndex
CREATE INDEX "Term_academic_year_id_idx" ON "results_mgt"."Term"("academic_year_id");

-- CreateIndex
CREATE INDEX "Term_start_date_idx" ON "results_mgt"."Term"("start_date");

-- CreateIndex
CREATE INDEX "Term_end_date_idx" ON "results_mgt"."Term"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "Term_academic_year_id_ordinal_key" ON "results_mgt"."Term"("academic_year_id", "ordinal");

-- AddForeignKey
ALTER TABLE "results_mgt"."AcademicYear" ADD CONSTRAINT "AcademicYear_term_template_id_fkey" FOREIGN KEY ("term_template_id") REFERENCES "results_mgt"."TermTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."Term" ADD CONSTRAINT "Term_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "results_mgt"."AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
