-- Read-only database audit for the Today page + contextual health-goal metric engine.
-- Run this against the same PostgreSQL database used by the API.
-- It intentionally returns metadata/counts only; it does not modify data.

-- 1) Required tables.
SELECT table_name,
       EXISTS (
         SELECT 1
         FROM information_schema.tables t2
         WHERE t2.table_schema = 'public' AND t2.table_name = t.table_name
       ) AS exists
FROM (VALUES ('HealthGoal'), ('HealthGoalProgress'), ('HealthGoalMetricConfig'), ('HealthGoalMetricEvent'), ('HealthJournal'), ('Patient'), ('PatientBaseline')) AS t(table_name);

-- 2) Metric config/event column contract.
SELECT table_name, ordinal_position, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('HealthGoalMetricConfig', 'HealthGoalMetricEvent')
ORDER BY table_name, ordinal_position;

-- 3) Constraints and indexes that must exist.
SELECT conrelid::regclass AS table_name, conname, contype
FROM pg_constraint
WHERE conrelid::regclass::text IN ('HealthGoalMetricConfig', 'HealthGoalMetricEvent')
ORDER BY table_name, conname;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('HealthGoalMetricConfig', 'HealthGoalMetricEvent')
ORDER BY tablename, indexname;

-- 4) Relevant Prisma migration history.
SELECT migration_name, started_at, finished_at, applied_steps_count, rolled_back_at, logs
FROM "_prisma_migrations"
WHERE migration_name IN (
  '20260912113000_multi_goal_contextual_engine',
  '20260912120000_multi_goal_engine_rules',
  '20260917130000_prevent_duplicate_medication_goals',
  '20260917150000_repair_health_goal_metric_tables',
  '20260917153000_harden_health_goal_metric_schema'
)
ORDER BY migration_name;

-- 5) Active goals and whether each has metric configuration.
SELECT g.id,
       g.patientId,
       g.title,
       g.category,
       g.status,
       g.targetValue,
       g.unit,
       g.createdAt,
       c.metricType,
       c.metricKey,
       c.frequency,
       c.frequencyTarget,
       c.aggregation,
       c.comparison
FROM "HealthGoal" g
LEFT JOIN "HealthGoalMetricConfig" c ON c."healthGoalId" = g.id
WHERE g.status IN ('ACTIVE', 'IN_PROGRESS')
ORDER BY g.patientId, g.createdAt;

-- 6) Active goals with no metric config: these cannot be evaluated by the metric engine.
SELECT g.id, g.patientId, g.title, g.category, g.status, g.targetValue, g.unit, g.createdAt
FROM "HealthGoal" g
LEFT JOIN "HealthGoalMetricConfig" c ON c."healthGoalId" = g.id
WHERE g.status IN ('ACTIVE', 'IN_PROGRESS')
  AND c.id IS NULL
ORDER BY g.patientId, g.createdAt;

-- 7) Metric configs whose goal no longer exists.
SELECT c.*
FROM "HealthGoalMetricConfig" c
LEFT JOIN "HealthGoal" g ON g.id = c."healthGoalId"
WHERE g.id IS NULL;

-- 8) Event coverage by metric/source.
SELECT "metricType", "metricKey", "source", COUNT(*) AS event_count,
       MIN("occurredAt") AS first_event, MAX("occurredAt") AS last_event
FROM "HealthGoalMetricEvent"
GROUP BY "metricType", "metricKey", "source"
ORDER BY "metricType", "metricKey", "source";

-- 9) The exact Today-page metrics currently read from metric events.
SELECT "metricType", "metricKey", "source", COUNT(*) AS event_count,
       MIN("occurredAt") AS first_event, MAX("occurredAt") AS last_event
FROM "HealthGoalMetricEvent"
WHERE ("metricType" = 'WEIGHT' AND "metricKey" = 'weight.kg')
   OR ("metricType" = 'EXERCISE' AND "metricKey" = 'exercise.minutes')
GROUP BY "metricType", "metricKey", "source"
ORDER BY "metricType", "metricKey", "source";

-- 10) Exercise journal rows that do not yet have a corresponding metric event.
SELECT j.id, j.patientId, j.createdAt, j.exerciseMinutes
FROM "HealthJournal" j
LEFT JOIN "HealthGoalMetricEvent" e
  ON e."patientId" = j."patientId"
 AND e."metricType" = 'EXERCISE'
 AND e."metricKey" = 'exercise.minutes'
 AND e."source" = 'health-journal'
 AND e."sourceId" = j.id
WHERE j.exerciseMinutes IS NOT NULL
  AND e.id IS NULL
ORDER BY j.createdAt DESC;

-- 11) Weight profile vs latest metric event.
SELECT p.id AS patient_id,
       p."weightKg" AS profile_weight_kg,
       e."loggedValue" AS latest_metric_weight_kg,
       e."occurredAt" AS latest_metric_at,
       e."source" AS latest_metric_source
FROM "Patient" p
LEFT JOIN LATERAL (
  SELECT "loggedValue", "occurredAt", "source"
  FROM "HealthGoalMetricEvent"
  WHERE "patientId" = p.id
    AND "metricType" = 'WEIGHT'
    AND "metricKey" = 'weight.kg'
  ORDER BY "occurredAt" DESC
  LIMIT 1
) e ON TRUE
WHERE p."weightKg" IS NOT NULL
ORDER BY p.id;

-- 12) Duplicate source projections. Duplicates are allowed historically, but these
-- identify retry/backfill pressure that should be reviewed.
SELECT "patientId", "source", "sourceId", "metricType", "metricKey", COUNT(*) AS duplicate_count,
       MIN("occurredAt") AS first_at, MAX("occurredAt") AS last_at
FROM "HealthGoalMetricEvent"
WHERE "sourceId" IS NOT NULL
GROUP BY "patientId", "source", "sourceId", "metricType", "metricKey"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 13) Known metric contract used by the current goal engine.
SELECT *
FROM (VALUES
  ('WEIGHT', 'weight.kg'),
  ('EXERCISE', 'exercise.minutes'),
  ('NUTRITION', 'nutrition.calories'),
  ('BLOOD_PRESSURE', 'blood_pressure.systolic'),
  ('BLOOD_PRESSURE', 'blood_pressure.diastolic'),
  ('BLOOD_GLUCOSE', 'blood_glucose.value'),
  ('CHOLESTEROL', 'cholesterol.total'),
  ('MEDICATION', 'medication.adherence'),
  ('SLEEP', 'sleep.hours'),
  ('MENTAL_HEALTH', 'mental.stress'),
  ('HYDRATION', 'hydration.ml'),
  ('SMOKING', 'smoking.cigarettes'),
  ('ALCOHOL', 'alcohol.frequency'),
  ('HEART_RATE', 'heart_rate.bpm')
) AS expected(metricType, metricKey);
