-- Personal goals use their own metric key so one custom goal cannot
-- consume another goal's measurements through the shared OTHER metric.
UPDATE "HealthGoalMetricConfig" c
SET "metricKey" = 'other.value.' || g."id"::text
FROM "HealthGoal" g
WHERE g."id"::text = c."healthGoalId"
  AND g."category"::text = 'OTHER'
  AND c."metricType" = 'OTHER'
  AND c."metricKey" = 'other.value';

-- Re-key previously recorded Today measurements to the personal goal encoded
-- in their sourceId. Unattributed legacy OTHER events are left untouched, but
-- no personal goal will continue to reference the shared key after this update.
UPDATE "HealthGoalMetricEvent" e
SET "metricKey" = 'other.value.' || g."id"::text
FROM "HealthGoal" g
WHERE g."category"::text = 'OTHER'
  AND e."patientId" = g."patientId"
  AND e."metricType" = 'OTHER'
  AND e."metricKey" = 'other.value'
  AND e."source" = 'goal-manual'
  AND e."sourceId" LIKE ('goal-' || g."id"::text || '-%');
