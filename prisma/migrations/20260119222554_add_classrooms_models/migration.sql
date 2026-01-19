-- CreateTable
CREATE TABLE "results_mgt"."ClassroomDefinition" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_mgt"."ClassroomOffering" (
    "id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "classroom_definition_id" TEXT NOT NULL,
    "display_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results_mgt"."StudentEnrollment" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "classroom_offering_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassroomDefinition_school_id_idx" ON "results_mgt"."ClassroomDefinition"("school_id");

-- CreateIndex
CREATE INDEX "ClassroomDefinition_is_archived_idx" ON "results_mgt"."ClassroomDefinition"("is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomDefinition_school_id_name_key" ON "results_mgt"."ClassroomDefinition"("school_id", "name");

-- CreateIndex
CREATE INDEX "ClassroomOffering_academic_year_id_idx" ON "results_mgt"."ClassroomOffering"("academic_year_id");

-- CreateIndex
CREATE INDEX "ClassroomOffering_classroom_definition_id_idx" ON "results_mgt"."ClassroomOffering"("classroom_definition_id");

-- CreateIndex
CREATE INDEX "ClassroomOffering_is_active_idx" ON "results_mgt"."ClassroomOffering"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomOffering_academic_year_id_classroom_definition_id_key" ON "results_mgt"."ClassroomOffering"("academic_year_id", "classroom_definition_id");

-- CreateIndex
CREATE INDEX "StudentEnrollment_student_id_idx" ON "results_mgt"."StudentEnrollment"("student_id");

-- CreateIndex
CREATE INDEX "StudentEnrollment_academic_year_id_idx" ON "results_mgt"."StudentEnrollment"("academic_year_id");

-- CreateIndex
CREATE INDEX "StudentEnrollment_classroom_offering_id_idx" ON "results_mgt"."StudentEnrollment"("classroom_offering_id");

-- CreateIndex
CREATE INDEX "StudentEnrollment_status_idx" ON "results_mgt"."StudentEnrollment"("status");

-- AddForeignKey
ALTER TABLE "results_mgt"."ClassroomOffering" ADD CONSTRAINT "ClassroomOffering_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "results_mgt"."AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."ClassroomOffering" ADD CONSTRAINT "ClassroomOffering_classroom_definition_id_fkey" FOREIGN KEY ("classroom_definition_id") REFERENCES "results_mgt"."ClassroomDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classroom_offering_id_fkey" FOREIGN KEY ("classroom_offering_id") REFERENCES "results_mgt"."ClassroomOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results_mgt"."StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "results_mgt"."AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
