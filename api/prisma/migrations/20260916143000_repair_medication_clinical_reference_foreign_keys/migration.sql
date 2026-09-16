BEGIN;

-- Remove rows that cannot be made relationally valid. These are orphaned
-- ingestion rows and cannot be returned by the clinical-reference joins.
DELETE FROM "MedicationClinicalReference" mcr
WHERE NOT EXISTS (
  SELECT 1
  FROM "Medication" m
  WHERE m.id = mcr."medicationId"
)
OR NOT EXISTS (
  SELECT 1
  FROM "Symptom" s
  WHERE s.id = mcr."symptomId"
);

-- Enforce the relational graph used by Prisma and the clinical-reference API.
ALTER TABLE "MedicationClinicalReference"
  ADD CONSTRAINT "MedicationClinicalReference_medicationId_fkey"
  FOREIGN KEY ("medicationId") REFERENCES "Medication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicationClinicalReference"
  ADD CONSTRAINT "MedicationClinicalReference_symptomId_fkey"
  FOREIGN KEY ("symptomId") REFERENCES "Symptom"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
