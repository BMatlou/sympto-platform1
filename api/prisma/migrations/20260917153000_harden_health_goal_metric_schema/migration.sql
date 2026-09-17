-- Harden the contextual health-goal metric tables.
-- This migration is intentionally non-destructive. It repairs partial schemas
-- without deleting metric events or goal configuration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  CONSTRAINT "HealthGoalMetricConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HealthGoalMetricConfig"
  ADD COLUMN IF NOT EXISTS "healthGoalId" TEXT,
  ADD COLUMN IF NOT EXISTS "metricType" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "metricKey" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "frequency" VARCHAR(16) NOT NULL DEFAULT 'DAILY',
  ADD COLUMN IF NOT EXISTS "frequencyTarget" NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS "guidanceText" TEXT,
  ADD COLUMN IF NOT EXISTS "aggregation" VARCHAR(16) NOT NULL DEFAULT 'SUM',
  ADD COLUMN IF NOT EXISTS "comparison" VARCHAR(16) NOT NULL DEFAULT 'AT_LEAST',
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

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
  CONSTRAINT "HealthGoalMetricEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HealthGoalMetricEvent"
  ADD COLUMN IF NOT EXISTS "patientId" TEXT,
  ADD COLUMN IF NOT EXISTS "metricType" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "metricKey" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "loggedValue" NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "sourceId" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HealthGoalMetricConfig_healthGoalId_key') THEN
    ALTER TABLE "HealthGoalMetricConfig"
      ADD CONSTRAINT "HealthGoalMetricConfig_healthGoalId_key" UNIQUE ("healthGoalId");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HealthGoalMetricConfig_healthGoalId_fkey') THEN
    ALTER TABLE "HealthGoalMetricConfig"
      ADD CONSTRAINT "HealthGoalMetricConfig_healthGoalId_fkey"
      FOREIGN KEY ("healthGoalId") REFERENCES "HealthGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HealthGoalMetricConfig_frequency_check') THEN
    ALTER TABLE "HealthGoalMetricConfig"
      ADD CONSTRAINT "HealthGoalMetricConfig_frequency_check"
      CHECK ("frequency" IN ('DAILY', 'WEEKLY', 'TOTAL'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HealthGoalMetricEvent_patientId_fkey') THEN
    ALTER TABLE "HealthGoalMetricEvent"
      ADD CONSTRAINT "HealthGoalMetricEvent_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "HealthGoalMetricConfig_metric_lookup_idx"
  ON "HealthGoalMetricConfig" ("metricType", "metricKey");

CREATE INDEX IF NOT EXISTS "HealthGoalMetricEvent_patient_metric_idx"
  ON "HealthGoalMetricEvent" ("patientId", "metricType", "metricKey", "occurredAt");

CREATE INDEX IF NOT EXISTS "HealthGoalMetricEvent_source_idx"
  ON "HealthGoalMetricEvent" ("source", "sourceId");
