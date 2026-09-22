-- Allow historical medication goals while keeping one live goal per medication.
-- The previous Prisma-level compound unique index applied to every status,
-- which prevented a cancelled or completed medication goal from ever being
-- replaced. The live-goal partial index created by
-- 20260921210000_harden_health_goal_uniqueness is the intended rule.

ALTER TABLE "HealthGoal"
  DROP CONSTRAINT IF EXISTS "HealthGoal_patientId_patientMedicationId_category_key";

DROP INDEX IF EXISTS "HealthGoal_patientId_patientMedicationId_category_key";
