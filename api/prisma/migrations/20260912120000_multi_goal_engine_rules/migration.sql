-- Per-goal evaluation rules. These extend the metric metadata without changing HealthGoal itself.
ALTER TABLE "HealthGoalMetricConfig"
  ADD COLUMN "aggregation" VARCHAR(16) NOT NULL DEFAULT 'SUM',
  ADD COLUMN "comparison" VARCHAR(16) NOT NULL DEFAULT 'AT_LEAST';

ALTER TABLE "HealthGoalMetricConfig"
  ADD CONSTRAINT "HealthGoalMetricConfig_aggregation_check"
  CHECK ("aggregation" IN ('SUM', 'LATEST', 'AVERAGE', 'MIN', 'MAX'));

ALTER TABLE "HealthGoalMetricConfig"
  ADD CONSTRAINT "HealthGoalMetricConfig_comparison_check"
  CHECK ("comparison" IN ('AT_LEAST', 'AT_MOST', 'CLOSEST', 'INCREASE_TO', 'DECREASE_TO'));
