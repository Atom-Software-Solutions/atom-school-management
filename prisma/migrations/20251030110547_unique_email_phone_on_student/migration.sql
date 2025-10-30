/*
  Warnings:

  - A unique constraint covering the columns `[student_no]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reg_no]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `student_no` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "student_mgt"."Student" ADD COLUMN     "reg_no" TEXT,
ADD COLUMN     "student_no" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Student_student_no_key" ON "student_mgt"."Student"("student_no");

-- CreateIndex
CREATE UNIQUE INDEX "Student_reg_no_key" ON "student_mgt"."Student"("reg_no");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "student_mgt"."Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_phone_key" ON "student_mgt"."Student"("phone");
