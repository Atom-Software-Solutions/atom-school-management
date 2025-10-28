-- CreateTable
CREATE TABLE "user_mgt"."Session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_jti_key" ON "user_mgt"."Session"("jti");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "user_mgt"."Session"("user_id");

-- AddForeignKey
ALTER TABLE "user_mgt"."Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_mgt"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
