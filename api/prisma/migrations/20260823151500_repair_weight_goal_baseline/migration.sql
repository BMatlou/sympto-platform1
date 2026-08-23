-- Repair the existing demo weight-loss goal so its first recorded weight remains the
-- immutable starting point. Jane's current recorded weight is 58kg and the existing
-- 10kg loss goal was created from a 70kg starting point, but an earlier implementation
-- incorrectly replaced that starting record with 60kg.
--
-- Only repair the earliest progress row for a weight goal that currently has a 58kg
-- patient weight, a 10kg target, and an earliest progress value of 60kg. This keeps
-- unrelated users/goals untouched.
UPDATE "HealthGoalProgress" p
SET "currentValue" = 70,
    "notes" = CASE
      WHEN p.notes IS NULL OR p.notes = '' THEN 'Starting weight: 70 kg (repaired from the original weight-goal baseline).'
      ELSE p.notes || ' Starting weight: 70 kg (repaired from the original weight-goal baseline).'
    END
FROM "HealthGoal" g
JOIN "Patient" pt ON pt.id = g."patientId"
WHERE p."healthGoalId" = g.id
  AND g.category::text = 'WEIGHT'
  AND g."targetValue" = 10
  AND pt."weightKg" = 58
  AND p."currentValue" = 60
  AND p."measuredAt" = (
    SELECT MIN(p2."measuredAt")
    FROM "HealthGoalProgress" p2
    WHERE p2."healthGoalId" = g.id
  );

-- Recompute the goal's latest/current state from the repaired 70kg starting point.
UPDATE "HealthGoal" g
SET "currentValue" = pt."weightKg",
    status = CASE WHEN (70 - pt."weightKg") >= g."targetValue" THEN 'ACHIEVED'::"HealthGoalStatus" ELSE g.status END,
    "achievedAt" = CASE WHEN (70 - pt."weightKg") >= g."targetValue" THEN COALESCE(g."achievedAt", NOW()) ELSE g."achievedAt" END
FROM "Patient" pt
WHERE pt.id = g."patientId"
  AND g.category::text = 'WEIGHT'
  AND g."targetValue" = 10
  AND pt."weightKg" = 58
  AND (70 - pt."weightKg") >= g."targetValue";

-- Make the repaired first progress row reflect the actual completed goal.
UPDATE "HealthGoalProgress" p
SET "progressPercent" = 100,
    status = 'ACHIEVED'::"HealthGoalProgressStatus"
FROM "HealthGoal" g
WHERE p."healthGoalId" = g.id
  AND g.category::text = 'WEIGHT'
  AND g."targetValue" = 10
  AND g.status = 'ACHIEVED'::"HealthGoalStatus"
  AND p."measuredAt" = (
    SELECT MIN(p2."measuredAt")
    FROM "HealthGoalProgress" p2
    WHERE p2."healthGoalId" = g.id
  );
