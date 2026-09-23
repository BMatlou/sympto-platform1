ALTER TABLE "MedicationEffect"
  ALTER COLUMN "medicationId" DROP NOT NULL;

ALTER TABLE "MedicationEffect"
  ADD COLUMN "reportedMedicationName" VARCHAR(300);

CREATE INDEX IF NOT EXISTS "MedicationEffect_reportedMedicationName_idx"
  ON "MedicationEffect" ("reportedMedicationName");
