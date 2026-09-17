-- Repair migration for the contextual health-goal metric engine.
-- Safe to run against environments where the feature tables already exist.
-- This protects existing data while restoring the tables if an earlier migration
-- was marked applied but the feature tables are missing.

CREATE TABLE IF NOT EXISTS "HealthGoalMetricConfig" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "healthGoalId" TEXT NOT NULL,
  "metricType" VARCHAR(64) NOT NULL,
  "metricKey" VARCHAR(128) NOT NULL,
  "frequency" VARCHAR(16) NOT NULL DEFAULT 'DAILY',
  "frequencyTarget" NUMERIC(12,2),
  "guidanceText" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthGoalMetricConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HealthGoalMetricConfig_healthGoalId_key" UNIQUE ("healthGoalId"),
  CONSTRAINT "HealthGoalMetricConfig_healthGoalId_fkey"
    FOREIGN KEY ("healthGoalId") REFERENCES "HealthGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HealthGoalMetricConfig_frequency_check"
    CHECK ("frequency" IN ('DAILY', 'WEEKLY', 'TOTAL'))
);

ALTER TABLE "HealthGoalMetricConfig"
  ADD COLUMN IF NOT EXISTS "aggregation" VARCHAR(16) NOT NULL DEFAULT 'SUM',
  ADD COLUMN IF NOT EXISTS "comparison" VARCHAR(16) NOT NULL DEFAULT 'AT_LEAST';

CREATE TABLE IF NOT EXISTS "HealthGoalMetricEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patientId" TEXT NOT NULL,
  "metricType" VARCHAR(64) NOT NULL,
  "metricKey" VARCHAR(128) NOT NULL,
  "loggedValue" NUMERIC(12,2) NOT NULL,
  "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" VARCHAR(64) NOT NULL,
  "sourceId" VARCHAR(128),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthGoalMetricEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HealthGoalMetricEvent_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "HealthGoalMetricConfig_metric_lookup_idx"
  ON "HealthGoalMetricConfig" ("metricType", "metricKey");

CREATE INDEX IF NOT EXISTS "HealthGoalMetricEvent_patient_metric_idx"
  ON "HealthGoalMetricEvent" ("patientId", "metricType", "metricKey", "occurredAt");

CREATE INDEX IF NOT EXISTS "HealthGoalMetricEvent_source_idx"
  ON "HealthGoalMetricEvent" ("source", "sourceId");
