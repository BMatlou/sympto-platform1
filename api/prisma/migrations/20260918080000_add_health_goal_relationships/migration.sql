-- Connect related health goals without changing existing goal or metric semantics.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "HealthGoalRelation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patientId" TEXT NOT NULL,
  "sourceGoalId" TEXT NOT NULL,
  "targetGoalId" TEXT NOT NULL,
  "relationshipType" VARCHAR(32) NOT NULL,
  "rationale" TEXT,
  "createdBy" VARCHAR(16) NOT NULL DEFAULT 'SYSTEM',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthGoalRelation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HealthGoalRelation_unique" UNIQUE ("sourceGoalId","targetGoalId","relationshipType"),
  CONSTRAINT "HealthGoalRelation_no_self_link" CHECK ("sourceGoalId" <> "targetGoalId"),
  CONSTRAINT "HealthGoalRelation_type_check"
    CHECK ("relationshipType" IN ('SUPPORTS','RELATED_TO','MONITORS')),
  CONSTRAINT "HealthGoalRelation_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HealthGoalRelation_sourceGoalId_fkey"
    FOREIGN KEY ("sourceGoalId") REFERENCES "HealthGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HealthGoalRelation_targetGoalId_fkey"
    FOREIGN KEY ("targetGoalId") REFERENCES "HealthGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "HealthGoalRelation_patient_idx"
  ON "HealthGoalRelation" ("patientId");

CREATE INDEX IF NOT EXISTS "HealthGoalRelation_source_idx"
  ON "HealthGoalRelation" ("sourceGoalId");

CREATE INDEX IF NOT EXISTS "HealthGoalRelation_target_idx"
  ON "HealthGoalRelation" ("targetGoalId");
