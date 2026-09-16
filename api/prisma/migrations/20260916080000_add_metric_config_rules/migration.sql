-- Add the metric rule fields already accepted by the health-goal API.
-- The previous metric-config migration created the table without these columns,
-- while HealthGoalsService.configureMetric() already writes them.
ALTER TABLE "HealthGoalMetricConfig"
  ADD COLUMN IF NOT EXISTS "aggregation" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "comparison" VARCHAR(16);

ALTER TABLE "HealthGoalMetricConfig"
  ADD CONSTRAINT "HealthGoalMetricConfig_aggregation_check"
  CHECK ("aggregation" IS NULL OR "aggregation" IN ('SUM', 'LATEST', 'AVERAGE', 'MIN', 'MAX'));

ALTER TABLE "HealthGoalMetricConfig"
  ADD CONSTRAINT "HealthGoalMetricConfig_comparison_check"
  CHECK ("comparison" IS NULL OR "comparison" IN ('AT_LEAST', 'AT_MOST', 'CLOSEST', 'INCREASE_TO', 'DECREASE_TO'));
