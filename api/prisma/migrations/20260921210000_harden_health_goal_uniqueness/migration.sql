-- Keep only the newest live goal when legacy duplicate rows already exist.
-- Completed/cancelled history is preserved.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "patientId", "category"
    ORDER BY "createdAt" DESC, id DESC
  ) AS rn
  FROM "HealthGoal"
  WHERE "status"::text IN ('ACTIVE', 'ON_HOLD')
    AND "category"::text <> 'MEDICATION'
)
UPDATE "HealthGoal" g
SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP
WHERE g.id IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "patientMedicationId"
    ORDER BY "createdAt" DESC, id DESC
  ) AS rn
  FROM "HealthGoal"
  WHERE "status"::text IN ('ACTIVE', 'ON_HOLD')
    AND "category"::text = 'MEDICATION'
    AND "patientMedicationId" IS NOT NULL
)
UPDATE "HealthGoal" g
SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP
WHERE g.id IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "patientId", "category"
    ORDER BY "createdAt" DESC, id DESC
  ) AS rn
  FROM "HealthGoal"
  WHERE "status"::text IN ('ACTIVE', 'ON_HOLD')
    AND "category"::text = 'MEDICATION'
    AND "patientMedicationId" IS NULL
)
UPDATE "HealthGoal" g
SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP
WHERE g.id IN (SELECT id FROM ranked WHERE rn > 1);

-- Non-medication categories: one live goal per patient/category.
CREATE UNIQUE INDEX IF NOT EXISTS "HealthGoal_one_live_goal_per_category_idx"
  ON "HealthGoal" ("patientId", "category")
  WHERE "category"::text <> 'MEDICATION'
    AND "status"::text IN ('ACTIVE', 'ON_HOLD');

-- Medication goals: one live goal per prescribed medication.
CREATE UNIQUE INDEX IF NOT EXISTS "HealthGoal_one_live_medication_goal_per_medication_idx"
  ON "HealthGoal" ("patientMedicationId")
  WHERE "category"::text = 'MEDICATION'
    AND "patientMedicationId" IS NOT NULL
    AND "status"::text IN ('ACTIVE', 'ON_HOLD');

-- Legacy/unlinked medication goals: still prevent duplicates for the patient.
CREATE UNIQUE INDEX IF NOT EXISTS "HealthGoal_one_live_unlinked_medication_goal_idx"
  ON "HealthGoal" ("patientId", "category")
  WHERE "category"::text = 'MEDICATION'
    AND "patientMedicationId" IS NULL
    AND "status"::text IN ('ACTIVE', 'ON_HOLD');
