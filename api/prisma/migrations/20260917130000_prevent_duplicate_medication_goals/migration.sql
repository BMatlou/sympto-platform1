-- Keep one live medication goal per prescribed medication before the
-- later health-goal uniqueness hardening migration is applied.
-- HealthGoalStatus does not contain ARCHIVED; cancelled goals are the
-- supported historical state and remain visible as goal history.

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "patientMedicationId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "HealthGoal"
  WHERE "category" = 'MEDICATION'
    AND "patientMedicationId" IS NOT NULL
    AND "status"::text IN ('ACTIVE', 'ON_HOLD')
)
UPDATE "HealthGoal" AS hg
SET
  "status" = 'CANCELLED',
  "achievedAt" = NULL
FROM ranked
WHERE hg."id" = ranked."id"
  AND ranked.row_number > 1;
