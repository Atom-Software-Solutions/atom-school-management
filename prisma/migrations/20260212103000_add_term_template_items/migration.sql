-- Create table to normalized TermTemplate structure
CREATE TABLE IF NOT EXISTS "results_mgt"."TermTemplateItem" (
    "id" TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
    "term_template_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TermTemplateItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "TermTemplateItem_term_template_id_idx" ON "results_mgt"."TermTemplateItem"("term_template_id");
CREATE INDEX IF NOT EXISTS "TermTemplateItem_name_idx" ON "results_mgt"."TermTemplateItem"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "TermTemplateItem_term_template_id_ordinal_key" ON "results_mgt"."TermTemplateItem"("term_template_id", "ordinal");

-- Foreign key
ALTER TABLE IF EXISTS "results_mgt"."TermTemplateItem" ADD CONSTRAINT "TermTemplateItem_term_template_id_fkey" FOREIGN KEY ("term_template_id") REFERENCES "results_mgt"."TermTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill rows from existing JSON `structure` if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'results_mgt' AND table_name = 'TermTemplate' AND column_name = 'structure'
  ) THEN
    INSERT INTO "results_mgt"."TermTemplateItem" (term_template_id, ordinal, name, start_date, end_date, created_at, updated_at)
    SELECT tt.id,
           (item ->> 'ordinal')::int,
           item ->> 'name',
           NULLIF(item ->> 'start_date', '')::timestamp(3),
           NULLIF(item ->> 'end_date', '')::timestamp(3),
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM "results_mgt"."TermTemplate" tt,
         jsonb_array_elements(tt.structure) AS item
    WHERE tt.structure IS NOT NULL AND jsonb_array_length(tt.structure) > 0;
  END IF;
END$$;
