import { Injectable } from '@nestjs/common';
import { HealthGoalProgressStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type GoalMetricEventInput = {
  patientId: string;
  metricType: string;
  metricKey: string;
  loggedValue: number;
  occurredAt?: Date;
  source?: string;
  sourceId?: string;
};

type GoalConfigRow = {
  healthGoalId: string;
  metricType: string;
  metricKey: string;
  frequency: string;
  frequencyTarget: number | null;
  guidanceText: string | null;
};

@Injectable()
export class GoalsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMetricEvent(input: GoalMetricEventInput) {
    const occurredAt = input.occurredAt ?? new Date();
    const source = input.source ?? 'unknown';

    if (!Number.isFinite(input.loggedValue)) return [];

    await this.prisma.$executeRaw`
      DELETE FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${input.patientId}
        AND "metricType" = ${input.metricType}
        AND "metricKey" = ${input.metricKey}
        AND "source" = ${source}
        AND COALESCE("sourceId", '') = COALESCE(${input.sourceId ?? null}, '')
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricEvent"
        ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId")
      VALUES
        (${input.patientId}, ${input.metricType}, ${input.metricKey}, ${input.loggedValue}, ${occurredAt}, ${source}, ${input.sourceId ?? null})
    `;

    return this.recomputeMatchingGoals(input.patientId, input.metricType, input.metricKey, occurredAt);
  }

  async recomputeMatchingGoals(
    patientId: string,
    metricType: string,
    metricKey: string,
    now = new Date(),
  ) {
    const configs = await this.prisma.$queryRaw<GoalConfigRow[]>`
      SELECT c."healthGoalId", c."metricType", c."metricKey", c."frequency", c."frequencyTarget", c."guidanceText"
      FROM "HealthGoalMetricConfig" c
      INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId"
      WHERE g."patientId" = ${patientId}
        AND g."status" = 'ACTIVE'
        AND c."metricType" = ${metricType}
        AND c."metricKey" = ${metricKey}
    `;

    const updated = [];
    for (const config of configs) {
      const goal = await this.prisma.healthGoal.findUnique({ where: { id: config.healthGoalId } });
      if (!goal) continue;
      if (goal.targetDate && goal.targetDate < now) continue;

      const start = this.windowStart(config.frequency, goal.createdAt, now);
      const value = await this.aggregateMetric(metricType, patientId, metricKey, start, now);
      const target = Number(config.frequencyTarget ?? goal.targetValue ?? 0);
      if (!(target > 0)) continue;

      const progressPercent = Math.min(100, Math.max(0, (value / target) * 100));
      const status = value >= target
        ? HealthGoalProgressStatus.ACHIEVED
        : HealthGoalProgressStatus.IMPROVING;

      await this.prisma.$transaction(async (tx) => {
        await tx.healthGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: String(value),
            status: status === HealthGoalProgressStatus.ACHIEVED ? 'ACHIEVED' : 'ACTIVE',
            achievedAt: status === HealthGoalProgressStatus.ACHIEVED ? now : null,
          },
        });

        await tx.healthGoalProgress.create({
          data: {
            healthGoalId: goal.id,
            currentValue: String(value),
            progressPercent: String(progressPercent.toFixed(2)),
            status,
            notes: config.guidanceText ?? `Updated automatically from ${metricKey}.`,
            measuredAt: now,
          },
        });
      });

      updated.push({
        goalId: goal.id,
        metricType: config.metricType,
        metricKey: config.metricKey,
        frequency: config.frequency,
        target,
        currentValue: value,
        progressPercent,
        status,
      });
    }

    return updated;
  }

  async backfillJournalMetrics(patientId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patientId} AND "source" = 'health-journal'
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricEvent"
        ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId")
      SELECT "patientId", 'EXERCISE', 'exercise.minutes', "exerciseMinutes", "createdAt", 'health-journal', "id"
      FROM "HealthJournal"
      WHERE "patientId" = ${patientId} AND "exerciseMinutes" IS NOT NULL
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricEvent"
        ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId")
      SELECT "patientId", 'HYDRATION', 'hydration.ml', "waterIntakeMl", "createdAt", 'health-journal', "id"
      FROM "HealthJournal"
      WHERE "patientId" = ${patientId} AND "waterIntakeMl" IS NOT NULL
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricEvent"
        ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId")
      SELECT "patientId", 'SLEEP', 'sleep.hours', "sleepHours", "createdAt", 'health-journal', "id"
      FROM "HealthJournal"
      WHERE "patientId" = ${patientId} AND "sleepHours" IS NOT NULL
    `;
  }

  async snapshot(patientId: string) {
    const goals = await this.prisma.healthGoal.findMany({
      where: { patientId, status: 'ACTIVE' },
      include: { progress: { orderBy: { measuredAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });

    const configs = await this.prisma.$queryRaw<GoalConfigRow[]>`
      SELECT "healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "guidanceText"
      FROM "HealthGoalMetricConfig"
      WHERE "healthGoalId" = ANY(${goals.map((goal) => goal.id)})
    `;

    const configByGoal = new Map(configs.map((config) => [config.healthGoalId, config]));

    return goals.map((goal) => ({
      ...goal,
      metricConfig: configByGoal.get(goal.id) ?? null,
    }));
  }

  private windowStart(frequency: string, goalCreatedAt: Date, now: Date) {
    if (frequency === 'TOTAL') return goalCreatedAt;

    const start = new Date(now);
    if (frequency === 'WEEKLY') {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
    }
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private async aggregateMetric(
    metricType: string,
    patientId: string,
    metricKey: string,
    start: Date,
    end: Date,
  ) {
    if (metricType === 'SLEEP') {
      const rows = await this.prisma.$queryRaw<{ loggedValue: number }[]>`
        SELECT "loggedValue"
        FROM "HealthGoalMetricEvent"
        WHERE "patientId" = ${patientId}
          AND "metricType" = ${metricType}
          AND "metricKey" = ${metricKey}
          AND "occurredAt" BETWEEN ${start} AND ${end}
        ORDER BY "occurredAt" DESC
        LIMIT 1
      `;
      return rows.length ? Number(rows[0].loggedValue) : 0;
    }

    const rows = await this.prisma.$queryRaw<{ total: number | null }[]>`
      SELECT SUM("loggedValue") AS total
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patientId}
        AND "metricType" = ${metricType}
        AND "metricKey" = ${metricKey}
        AND "occurredAt" BETWEEN ${start} AND ${end}
    `;
    return Number(rows[0]?.total ?? 0);
  }
}
