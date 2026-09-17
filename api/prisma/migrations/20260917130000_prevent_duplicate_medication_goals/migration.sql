-- Keep the first linked medication goal and archive any older duplicates before
-- adding the database guard. This preserves history without showing duplicate
-- medication goals in the active health-goals experience.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "patientMedicationId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM "HealthGoal"
  WHERE "category" = 'MEDICATION'
    AND "patientMedicationId" IS NOT NULL
)
UPDATE "HealthGoal" AS hg
SET
  "patientMedicationId" = NULL,
  "status" = 'ARCHIVED'
FROM ranked
WHERE hg."id" = ranked."id"
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX "HealthGoal_patientMedicationId_medication_unique"
ON "HealthGoal" ("patientMedicationId")
WHERE "category" = 'MEDICATION'
  AND "patientMedicationId" IS NOT NULL;
