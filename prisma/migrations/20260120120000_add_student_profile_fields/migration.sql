-- Add new student profile fields
ALTER TABLE "student_mgt"."Student"
  ADD COLUMN IF NOT EXISTS "gender" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT,
  ADD COLUMN IF NOT EXISTS "date_of_birth" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "religion" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

