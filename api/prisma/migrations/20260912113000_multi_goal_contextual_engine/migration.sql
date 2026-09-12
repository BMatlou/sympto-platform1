-- Multi-goal contextual matching metadata.
-- Uses TEXT foreign keys because existing Sympto IDs are Prisma String/TEXT columns.
CREATE TABLE "HealthGoalMetricConfig" (
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

CREATE INDEX "HealthGoalMetricConfig_metric_lookup_idx"
  ON "HealthGoalMetricConfig" ("metricType", "metricKey");

-- Normalized metric events. Domain modules keep their rich records;
-- this table is the predictable stream consumed by the contextual goal engine.
CREATE TABLE "HealthGoalMetricEvent" (
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
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "HealthGoalMetricEvent_patient_metric_idx"
  ON "HealthGoalMetricEvent" ("patientId", "metricType", "metricKey", "occurredAt");

CREATE INDEX "HealthGoalMetricEvent_source_idx"
  ON "HealthGoalMetricEvent" ("source", "sourceId");
