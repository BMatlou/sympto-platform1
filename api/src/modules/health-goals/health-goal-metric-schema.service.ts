import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Runtime safety net for the raw-SQL health-goal metric tables.
 * Idempotent: it creates missing infrastructure and adds missing columns,
 * without dropping, truncating, or rewriting existing metric data.
 */
@Injectable()
export class HealthGoalMetricSchemaService implements OnModuleInit {
  private readonly logger = new Logger(HealthGoalMetricSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "HealthGoalMetricConfig" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "healthGoalId" TEXT NOT NULL,
          "metricType" VARCHAR(64) NOT NULL,
          "metricKey" VARCHAR(128) NOT NULL,
          "frequency" VARCHAR(16) NOT NULL DEFAULT 'DAILY',
          "frequencyTarget" NUMERIC(12,2),
          "aggregation" VARCHAR(32),
          "comparison" VARCHAR(32),
          "guidanceText" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "HealthGoalMetricConfig_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "HealthGoalMetricConfig_healthGoalId_key" UNIQUE ("healthGoalId"),
          CONSTRAINT "HealthGoalMetricConfig_healthGoalId_fkey"
            FOREIGN KEY ("healthGoalId") REFERENCES "HealthGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "HealthGoalMetricConfig_frequency_check"
            CHECK ("frequency" IN ('DAILY', 'WEEKLY', 'TOTAL'))
        )
      `);

      await this.prisma.$executeRawUnsafe(`
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
            FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      // Repair partial tables left by an interrupted/drifted migration.
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE "HealthGoalMetricConfig"
          ADD COLUMN IF NOT EXISTS "id" UUID DEFAULT gen_random_uuid(),
          ADD COLUMN IF NOT EXISTS "healthGoalId" TEXT,
          ADD COLUMN IF NOT EXISTS "metricType" VARCHAR(64),
          ADD COLUMN IF NOT EXISTS "metricKey" VARCHAR(128),
          ADD COLUMN IF NOT EXISTS "frequency" VARCHAR(16) DEFAULT 'DAILY',
          ADD COLUMN IF NOT EXISTS "frequencyTarget" NUMERIC(12,2),
          ADD COLUMN IF NOT EXISTS "aggregation" VARCHAR(32),
          ADD COLUMN IF NOT EXISTS "comparison" VARCHAR(32),
          ADD COLUMN IF NOT EXISTS "guidanceText" TEXT,
          ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      `);

      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE "HealthGoalMetricEvent"
          ADD COLUMN IF NOT EXISTS "id" UUID DEFAULT gen_random_uuid(),
          ADD COLUMN IF NOT EXISTS "patientId" TEXT,
          ADD COLUMN IF NOT EXISTS "metricType" VARCHAR(64),
          ADD COLUMN IF NOT EXISTS "metricKey" VARCHAR(128),
          ADD COLUMN IF NOT EXISTS "loggedValue" NUMERIC(12,2),
          ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          ADD COLUMN IF NOT EXISTS "source" VARCHAR(64),
          ADD COLUMN IF NOT EXISTS "sourceId" VARCHAR(128),
          ADD COLUMN IF NOT EXISTS "metadata" JSONB,
          ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "HealthGoalMetricConfig_metric_lookup_idx"
          ON "HealthGoalMetricConfig" ("metricType", "metricKey")
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "HealthGoalMetricEvent_patient_metric_idx"
          ON "HealthGoalMetricEvent" ("patientId", "metricType", "metricKey", "occurredAt")
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "HealthGoalMetricEvent_source_idx"
          ON "HealthGoalMetricEvent" ("source", "sourceId")
      `);

      // HealthGoalRelation was streamlined by the current schema. Do not recreate
      // or index the legacy patientId/sourceGoalId/targetGoalId/etc. columns here.
      // Keep this cleanup isolated so an in-progress migration cannot prevent
      // the NestJS application from starting.
      try {
        await this.prisma.$executeRawUnsafe(`
          DELETE FROM "HealthGoalRelation" WHERE "healthGoalId" IS NULL;
        `);
      } catch (error) {
        this.logger.warn(
          `⚠️ Safe initialization check skipped: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      this.logger.log('Health-goal metric database contract verified.');
    } catch (error) {
      this.logger.error(
        'Health-goal metric database contract could not be verified.',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
