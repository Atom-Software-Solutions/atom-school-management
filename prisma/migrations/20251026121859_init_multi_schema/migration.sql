-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "payment_mgt";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "user_mgt";

-- CreateEnum
CREATE TYPE "user_mgt"."Role" AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'PARENT', 'STUDENT');

-- CreateTable
CREATE TABLE "user_mgt"."School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mgt"."User" (
    "id" TEXT NOT NULL,
    "school_id" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "user_mgt"."Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_mgt"."Payment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "status" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_mgt"."PaymentTransaction" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "user_mgt"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "user_mgt"."User"("phone");

-- CreateIndex
CREATE INDEX "User_school_id_idx" ON "user_mgt"."User"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "payment_mgt"."Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_user_id_idx" ON "payment_mgt"."Payment"("user_id");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "payment_mgt"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_reference_idx" ON "payment_mgt"."Payment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_reference_key" ON "payment_mgt"."PaymentTransaction"("reference");

-- CreateIndex
CREATE INDEX "PaymentTransaction_payment_id_idx" ON "payment_mgt"."PaymentTransaction"("payment_id");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "payment_mgt"."PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_reference_idx" ON "payment_mgt"."PaymentTransaction"("reference");

-- AddForeignKey
ALTER TABLE "user_mgt"."User" ADD CONSTRAINT "User_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "user_mgt"."School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_mgt"."PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_mgt"."Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
