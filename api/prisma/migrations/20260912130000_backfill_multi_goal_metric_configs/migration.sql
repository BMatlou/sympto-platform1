-- Backfill metric configuration for existing active/achievable goals created before
-- the contextual goal engine was introduced. This makes existing goals behave
-- exactly like newly-created goals without changing HealthGoal itself.

INSERT INTO "HealthGoalMetricConfig"
  ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "aggregation", "comparison")
SELECT
  g."id",
  CASE g."category"
    WHEN 'WEIGHT' THEN 'WEIGHT'
    WHEN 'EXERCISE' THEN 'EXERCISE'
    WHEN 'NUTRITION' THEN 'NUTRITION'
    WHEN 'BLOOD_PRESSURE' THEN 'BLOOD_PRESSURE'
    WHEN 'BLOOD_GLUCOSE' THEN 'BLOOD_GLUCOSE'
    WHEN 'CHOLESTEROL' THEN 'CHOLESTEROL'
    WHEN 'MEDICATION' THEN 'MEDICATION'
    WHEN 'SLEEP' THEN 'SLEEP'
    WHEN 'MENTAL_HEALTH' THEN 'MENTAL_HEALTH'
    WHEN 'HYDRATION' THEN 'HYDRATION'
    WHEN 'SMOKING' THEN 'SMOKING'
    WHEN 'ALCOHOL' THEN 'ALCOHOL'
    WHEN 'HEART_RATE' THEN 'HEART_RATE'
    ELSE 'OTHER'
  END,
  CASE g."category"
    WHEN 'WEIGHT' THEN 'weight.kg'
    WHEN 'EXERCISE' THEN 'exercise.minutes'
    WHEN 'NUTRITION' THEN 'nutrition.calories'
    WHEN 'BLOOD_PRESSURE' THEN 'blood_pressure.systolic'
    WHEN 'BLOOD_GLUCOSE' THEN 'blood_glucose.value'
    WHEN 'CHOLESTEROL' THEN 'cholesterol.total'
    WHEN 'MEDICATION' THEN 'medication.adherence'
    WHEN 'SLEEP' THEN 'sleep.hours'
    WHEN 'MENTAL_HEALTH' THEN 'mental.stress'
    WHEN 'HYDRATION' THEN 'hydration.ml'
    WHEN 'SMOKING' THEN 'smoking.status'
    WHEN 'ALCOHOL' THEN 'alcohol.frequency'
    WHEN 'HEART_RATE' THEN 'heart_rate.bpm'
    ELSE 'other.value'
  END,
  CASE g."category"
    WHEN 'WEIGHT' THEN 'TOTAL'
    WHEN 'EXERCISE' THEN 'DAILY'
    WHEN 'NUTRITION' THEN 'DAILY'
    WHEN 'BLOOD_PRESSURE' THEN 'DAILY'
    WHEN 'BLOOD_GLUCOSE' THEN 'DAILY'
    WHEN 'CHOLESTEROL' THEN 'TOTAL'
    WHEN 'MEDICATION' THEN 'WEEKLY'
    WHEN 'SLEEP' THEN 'DAILY'
    WHEN 'MENTAL_HEALTH' THEN 'DAILY'
    WHEN 'HYDRATION' THEN 'DAILY'
    WHEN 'SMOKING' THEN 'TOTAL'
    WHEN 'ALCOHOL' THEN 'WEEKLY'
    WHEN 'HEART_RATE' THEN 'DAILY'
    ELSE 'TOTAL'
  END,
  g."targetValue",
  CASE g."category"
    WHEN 'WEIGHT' THEN 'LATEST'
    WHEN 'EXERCISE' THEN 'SUM'
    WHEN 'NUTRITION' THEN 'SUM'
    WHEN 'BLOOD_PRESSURE' THEN 'LATEST'
    WHEN 'BLOOD_GLUCOSE' THEN 'LATEST'
    WHEN 'CHOLESTEROL' THEN 'LATEST'
    WHEN 'MEDICATION' THEN 'AVERAGE'
    WHEN 'SLEEP' THEN 'LATEST'
    WHEN 'MENTAL_HEALTH' THEN 'LATEST'
    WHEN 'HYDRATION' THEN 'SUM'
    WHEN 'SMOKING' THEN 'LATEST'
    WHEN 'ALCOHOL' THEN 'LATEST'
    WHEN 'HEART_RATE' THEN 'LATEST'
    ELSE 'LATEST'
  END,
  CASE g."category"
    WHEN 'WEIGHT' THEN 'DECREASE_TO'
    WHEN 'EXERCISE' THEN 'AT_LEAST'
    WHEN 'NUTRITION' THEN 'AT_MOST'
    WHEN 'BLOOD_PRESSURE' THEN 'AT_MOST'
    WHEN 'BLOOD_GLUCOSE' THEN 'AT_MOST'
    WHEN 'CHOLESTEROL' THEN 'AT_MOST'
    WHEN 'MEDICATION' THEN 'AT_LEAST'
    WHEN 'SLEEP' THEN 'AT_LEAST'
    WHEN 'MENTAL_HEALTH' THEN 'AT_MOST'
    WHEN 'HYDRATION' THEN 'AT_LEAST'
    WHEN 'SMOKING' THEN 'AT_MOST'
    WHEN 'ALCOHOL' THEN 'AT_MOST'
    WHEN 'HEART_RATE' THEN 'AT_MOST'
    ELSE 'CLOSEST'
  END
FROM "HealthGoal" g
WHERE g."status" = 'ACTIVE'
  AND g."targetValue" IS NOT NULL
  AND g."targetValue" > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "HealthGoalMetricConfig" c
    WHERE c."healthGoalId" = g."id"
  );
