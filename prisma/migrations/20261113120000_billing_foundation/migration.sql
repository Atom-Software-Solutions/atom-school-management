-- CreateEnum
CREATE TYPE "payment_mgt"."FeeFrequency" AS ENUM ('ONCE', 'PER_TERM', 'PER_YEAR');

-- CreateEnum
CREATE TYPE "payment_mgt"."InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_mgt"."InvoiceKind" AS ENUM ('TERM', 'ADHOC');

-- CreateEnum
CREATE TYPE "payment_mgt"."FeeAssignmentStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "payment_mgt"."NumberSequenceKind" AS ENUM ('INVOICE', 'RECEIPT');

-- AlterTable
ALTER TABLE "payment_mgt"."Payment" ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "invoice_id" TEXT,
ADD COLUMN     "payer_name" TEXT,
ADD COLUMN     "payer_phone" TEXT,
ADD COLUMN     "receipt_number" TEXT,
ADD COLUMN     "received_at" TIMESTAMP(3),
ADD COLUMN     "recorded_by_user_id" TEXT,
ADD COLUMN     "reversal_reason" TEXT,
ADD COLUMN     "reversed_at" TIMESTAMP(3),
ADD COLUMN     "reversed_by_user_id" TEXT,
ADD COLUMN     "student_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "payment_mgt"."PaymentTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- CreateTable
CREATE TABLE "payment_mgt"."FeeCategory" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_mgt"."FeeStructure" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "term_template_item_id" TEXT,
    "classroom_definition_id" TEXT,
    "fee_category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "frequency" "payment_mgt"."FeeFrequency" NOT NULL DEFAULT 'PER_TERM',
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_mgt"."StudentFeeAssignment" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "fee_structure_id" TEXT NOT NULL,
    "amount_override" DECIMAL(14,2),
    "waived_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "waiver_reason" TEXT,
    "waived_by_user_id" TEXT,
    "status" "payment_mgt"."FeeAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_mgt"."Invoice" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "term_template_item_id" TEXT,
    "kind" "payment_mgt"."InvoiceKind" NOT NULL DEFAULT 'TERM',
    "invoice_number" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "issue_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "waived_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "payment_mgt"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "generation_batch_id" TEXT,
    "created_by_user_id" TEXT,
    "issued_by_user_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_user_id" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_mgt"."InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "fee_structure_id" TEXT,
    "fee_category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(14,2) NOT NULL,
    "waived_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_mgt"."InvoiceGenerationBatch" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "term_template_item_id" TEXT,
    "classroom_definition_id" TEXT,
    "requested_by_user_id" TEXT NOT NULL,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceGenerationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_mgt"."NumberSequence" (
    "school_id" TEXT NOT NULL,
    "kind" "payment_mgt"."NumberSequenceKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("school_id","kind","year")
);

-- CreateIndex
CREATE INDEX "FeeCategory_school_id_idx" ON "payment_mgt"."FeeCategory"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "FeeCategory_school_id_code_key" ON "payment_mgt"."FeeCategory"("school_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "FeeCategory_school_id_name_key" ON "payment_mgt"."FeeCategory"("school_id", "name");

-- CreateIndex
CREATE INDEX "FeeStructure_school_id_idx" ON "payment_mgt"."FeeStructure"("school_id");

-- CreateIndex
CREATE INDEX "FeeStructure_academic_year_id_idx" ON "payment_mgt"."FeeStructure"("academic_year_id");

-- CreateIndex
CREATE INDEX "FeeStructure_term_template_item_id_idx" ON "payment_mgt"."FeeStructure"("term_template_item_id");

-- CreateIndex
CREATE INDEX "FeeStructure_classroom_definition_id_idx" ON "payment_mgt"."FeeStructure"("classroom_definition_id");

-- CreateIndex
CREATE INDEX "FeeStructure_fee_category_id_idx" ON "payment_mgt"."FeeStructure"("fee_category_id");

-- CreateIndex
CREATE INDEX "StudentFeeAssignment_school_id_idx" ON "payment_mgt"."StudentFeeAssignment"("school_id");

-- CreateIndex
CREATE INDEX "StudentFeeAssignment_fee_structure_id_idx" ON "payment_mgt"."StudentFeeAssignment"("fee_structure_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeAssignment_student_id_fee_structure_id_key" ON "payment_mgt"."StudentFeeAssignment"("student_id", "fee_structure_id");

-- CreateIndex
CREATE INDEX "Invoice_school_id_idx" ON "payment_mgt"."Invoice"("school_id");

-- CreateIndex
CREATE INDEX "Invoice_student_id_idx" ON "payment_mgt"."Invoice"("student_id");

-- CreateIndex
CREATE INDEX "Invoice_academic_year_id_term_template_item_id_idx" ON "payment_mgt"."Invoice"("academic_year_id", "term_template_item_id");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "payment_mgt"."Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_due_date_idx" ON "payment_mgt"."Invoice"("due_date");

-- CreateIndex
CREATE INDEX "Invoice_generation_batch_id_idx" ON "payment_mgt"."Invoice"("generation_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_school_id_invoice_number_key" ON "payment_mgt"."Invoice"("school_id", "invoice_number");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoice_id_idx" ON "payment_mgt"."InvoiceLineItem"("invoice_id");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_fee_structure_id_idx" ON "payment_mgt"."InvoiceLineItem"("fee_structure_id");

-- CreateIndex
CREATE INDEX "InvoiceGenerationBatch_school_id_idx" ON "payment_mgt"."InvoiceGenerationBatch"("school_id");

-- CreateIndex
CREATE INDEX "Payment_student_id_idx" ON "payment_mgt"."Payment"("student_id");

-- CreateIndex
CREATE INDEX "Payment_invoice_id_idx" ON "payment_mgt"."Payment"("invoice_id");

-- CreateIndex
CREATE INDEX "Payment_received_at_idx" ON "payment_mgt"."Payment"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_school_id_receipt_number_key" ON "payment_mgt"."Payment"("school_id", "receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_school_id_idempotency_key_key" ON "payment_mgt"."Payment"("school_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "payment_mgt"."Payment" ADD CONSTRAINT "Payment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "payment_mgt"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."FeeStructure" ADD CONSTRAINT "FeeStructure_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "results_mgt"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."FeeStructure" ADD CONSTRAINT "FeeStructure_term_template_item_id_fkey" FOREIGN KEY ("term_template_item_id") REFERENCES "results_mgt"."TermTemplateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."FeeStructure" ADD CONSTRAINT "FeeStructure_classroom_definition_id_fkey" FOREIGN KEY ("classroom_definition_id") REFERENCES "results_mgt"."ClassroomDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."FeeStructure" ADD CONSTRAINT "FeeStructure_fee_category_id_fkey" FOREIGN KEY ("fee_category_id") REFERENCES "payment_mgt"."FeeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."StudentFeeAssignment" ADD CONSTRAINT "StudentFeeAssignment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."StudentFeeAssignment" ADD CONSTRAINT "StudentFeeAssignment_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "payment_mgt"."FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."Invoice" ADD CONSTRAINT "Invoice_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_mgt"."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."Invoice" ADD CONSTRAINT "Invoice_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "results_mgt"."AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."Invoice" ADD CONSTRAINT "Invoice_term_template_item_id_fkey" FOREIGN KEY ("term_template_item_id") REFERENCES "results_mgt"."TermTemplateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."Invoice" ADD CONSTRAINT "Invoice_generation_batch_id_fkey" FOREIGN KEY ("generation_batch_id") REFERENCES "payment_mgt"."InvoiceGenerationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "payment_mgt"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "payment_mgt"."FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_fee_category_id_fkey" FOREIGN KEY ("fee_category_id") REFERENCES "payment_mgt"."FeeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written: one generated TERM invoice per student per term (cancelled invoices excluded
-- so a cancelled invoice can be re-generated). Prisma cannot express partial unique indexes.
CREATE UNIQUE INDEX "Invoice_one_term_invoice_per_student"
  ON "payment_mgt"."Invoice" ("student_id", "academic_year_id", COALESCE("term_template_item_id", ''))
  WHERE "kind" = 'TERM' AND "status" <> 'CANCELLED';
