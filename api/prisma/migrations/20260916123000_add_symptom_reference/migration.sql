CREATE TABLE "symptom_reference" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "synonyms" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "symptom_reference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "symptom_reference_name_key" ON "symptom_reference"("name");
CREATE INDEX "symptom_reference_category_idx" ON "symptom_reference"("category");
CREATE INDEX "symptom_reference_active_idx" ON "symptom_reference"("active");
