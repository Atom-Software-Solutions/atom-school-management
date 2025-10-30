-- AlterTable
ALTER TABLE "student_mgt"."Student" ADD COLUMN     "class_id" TEXT;

-- CreateTable
CREATE TABLE "student_mgt"."Classroom" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Classroom_school_id_idx" ON "student_mgt"."Classroom"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_school_id_name_key" ON "student_mgt"."Classroom"("school_id", "name");

-- AddForeignKey
ALTER TABLE "student_mgt"."Student" ADD CONSTRAINT "Student_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "student_mgt"."Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
