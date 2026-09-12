import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export type GoalMetricType =
  | 'MEDICATION'
  | 'EXERCISE'
  | 'HYDRATION'
  | 'SMOKING_CESSATION';

export type GoalFrequency = 'DAILY' | 'WEEKLY' | 'TOTAL';

export interface GoalMetricEventInput {
  patientId: string;
  metricType: GoalMetricType | string;
  metricKey: string;
  loggedValue: number;
  occurredAt?: Date;
  source: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface GoalSnapshot {
  id: string;
  title: string;
  category: string;
  metricType: string;
  metricKey: string;
  frequency: GoalFrequency;
  frequencyTarget: number | null;
  currentProgress: number;
  targetValue: number;
  currentValue: number;
  targetDate: string | null;
  guidanceText: string;
  unit: string | null;
  status: string;
}

interface RawGoal {
  id: string;
  patientId: string;
  title: string;
  category: string;
  targetValue: Prisma.Decimal | null;
  currentValue: Prisma.Decimal | null;
  targetDate: Date | null;
  createdAt: Date;
  status: string;
  unit: string | null;
}

interface RawGoalConfig {
  healthGoalId: string;
  metricType: string;
  metricKey: string;
  frequency: GoalFrequency;
  frequencyTarget: Prisma.Decimal | null;
  guidanceText: string | null;
}

@Injectable()
export class GoalsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMetricEvent(input: GoalMetricEventInput) {
    const occurredAt = input.occurredAt ?? new Date();

    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricEvent"
        ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId", "metadata")
      VALUES
        (${input.patientId}, ${input.metricType}, ${input.metricKey}, ${input.loggedValue}, ${occurredAt}, ${input.source}, ${input.sourceId ?? null}, ${JSON.stringify(input.metadata ?? {})}::jsonb)
    `;

    return this.processMetricEvent(
      input.patientId,
      input.metricType,
      input.metricKey,
      occurredAt,
    );
  }

  async processMetricEvent(
    patientId: string,
    metricType: string,
    metricKey: string,
    occurredAt = new Date(),
  ) {
    const matchingGoals = await this.getMatchingActiveGoals(
      patientId,
      metricType,
      metricKey,
    );

    for (const goal of matchingGoals) {
      await this.recalculateGoal(goal, occurredAt);
    }

    return {
      updatedGoals: await this.getActiveSnapshot(patientId),
    };
  }

  async getActiveSnapshot(patientId: string): Promise<GoalSnapshot[]> {
    const goals = await this.getActiveGoals(patientId);
    if (!goals.length) return [];

    const goalIds = goals.map((goal) => goal.id);
    const configs = await this.getConfigs(goalIds);
    const configByGoalId = new Map(
      configs.map((config) => [config.healthGoalId, config]),
    );

    return Promise.all(
      goals.map(async (goal) => {
        const config = configByGoalId.get(goal.id);

        if (!config) {
          return this.toSnapshot(goal, null, 0, 0);
        }

        const currentValue = await this.calculateGoalValue(goal, config);
        const targetValue = this.toNumber(goal.targetValue);
        const currentProgress = this.calculateProgress(
          currentValue,
          targetValue,
        );

        return this.toSnapshot(
          goal,
          config,
          currentValue,
          currentProgress,
        );
      }),
    );
  }

  async backfillPatientJournalEvents(patientId: string) {
    const journals = await this.prisma.healthJournal.findMany({
      where: { patientId },
      select: {
        id: true,
        createdAt: true,
        exerciseMinutes: true,
        waterIntakeMl: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const journal of journals) {
      if (journal.exerciseMinutes !== null) {
        await this.insertEventUnlessExists({
          patientId,
          metricType: 'EXERCISE',
          metricKey: 'exercise.minutes',
          loggedValue: journal.exerciseMinutes,
          occurredAt: journal.createdAt,
          source: 'health-journal',
          sourceId: journal.id,
        });
      }

      if (journal.waterIntakeMl !== null) {
        await this.insertEventUnlessExists({
          patientId,
          metricType: 'HYDRATION',
          metricKey: 'hydration.ml',
          loggedValue: journal.waterIntakeMl,
          occurredAt: journal.createdAt,
          source: 'health-journal',
          sourceId: journal.id,
        });
      }
    }
  }

  private async insertEventUnlessExists(input: GoalMetricEventInput) {
    const exists = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${input.patientId}
        AND "metricType" = ${input.metricType}
        AND "metricKey" = ${input.metricKey}
        AND "source" = ${input.source}
        AND "sourceId" = ${input.sourceId ?? null}
      LIMIT 1
    `;

    if (exists.length) return;

    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricEvent"
        ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId", "metadata")
      VALUES
        (${input.patientId}, ${input.metricType}, ${input.metricKey}, ${input.loggedValue}, ${input.occurredAt ?? new Date()}, ${input.source}, ${input.sourceId ?? null}, ${JSON.stringify(input.metadata ?? {})}::jsonb)
    `;
  }

  private async getActiveGoals(patientId: string): Promise<RawGoal[]> {
    return this.prisma.healthGoal.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
      },
      orderBy: [
        { priority: 'desc' },
        { targetDate: 'asc' },
        { createdAt: 'desc' },
      ],
    }) as unknown as Promise<RawGoal[]>;
  }

  private async getMatchingActiveGoals(
    patientId: string,
    metricType: string,
    metricKey: string,
  ): Promise<RawGoal[]> {
    const goals = await this.getActiveGoals(patientId);
    if (!goals.length) return [];

    const configs = await this.getConfigs(goals.map((goal) => goal.id));
    const matchingIds = new Set(
      configs
        .filter(
          (config) =>
            config.metricType === metricType &&
            config.metricKey === metricKey,
        )
        .map((config) => config.healthGoalId),
    );

    return goals.filter((goal) => matchingIds.has(goal.id));
  }

  private async getConfigs(goalIds: string[]): Promise<RawGoalConfig[]> {
    if (!goalIds.length) return [];

    return this.prisma.$queryRaw<RawGoalConfig[]>`
      SELECT
        "healthGoalId",
        "metricType",
        "metricKey",
        "frequency",
        "frequencyTarget",
        "guidanceText"
      FROM "HealthGoalMetricConfig"
      WHERE "healthGoalId" IN (${Prisma.join(goalIds)})
    `;
  }

  private async recalculateGoal(goal: RawGoal, occurredAt: Date) {
    const configs = await this.getConfigs([goal.id]);
    const config = configs[0];
    if (!config) return;

    const currentValue = await this.calculateGoalValue(goal, config, occurredAt);
    const targetValue = this.toNumber(goal.targetValue);
    const progress = this.calculateProgress(currentValue, targetValue);

    await this.prisma.healthGoal.update({
      where: { id: goal.id },
      data: {
        currentValue,
      },
    });

    await this.prisma.healthGoalProgress.create({
      data: {
        healthGoalId: goal.id,
        currentValue,
        progressPercent: progress,
        status: progress >= 100 ? 'ACHIEVED' : 'ON_TRACK',
        measuredAt: occurredAt,
        notes: `${config.metricType}/${config.metricKey} updated by contextual goals engine.`,
      },
    });
  }

  private async calculateGoalValue(
    goal: RawGoal,
    config: RawGoalConfig,
    anchorDate = new Date(),
  ): Promise<number> {
    const startDate = this.getWindowStart(goal, config.frequency, anchorDate);
    const endDate = goal.targetDate && goal.targetDate < anchorDate
      ? goal.targetDate
      : anchorDate;

    const result = await this.prisma.$queryRaw<
      Array<{ total: Prisma.Decimal | null }>
    >`
      SELECT COALESCE(SUM("loggedValue"), 0) AS "total"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${goal.patientId}
        AND "metricType" = ${config.metricType}
        AND "metricKey" = ${config.metricKey}
        AND "occurredAt" >= ${startDate}
        AND "occurredAt" <= ${endDate}
    `;

    return this.toNumber(result[0]?.total);
  }

  private getWindowStart(
    goal: RawGoal,
    frequency: GoalFrequency,
    anchorDate: Date,
  ) {
    if (frequency === 'TOTAL') return goal.createdAt;

    const start = new Date(anchorDate);
    start.setUTCHours(0, 0, 0, 0);

    if (frequency === 'WEEKLY') {
      const day = start.getUTCDay();
      const daysFromMonday = (day + 6) % 7;
      start.setUTCDate(start.getUTCDate() - daysFromMonday);
    }

    return start;
  }

  private calculateProgress(currentValue: number, targetValue: number) {
    if (!Number.isFinite(targetValue) || targetValue <= 0) return 0;
    return Math.min(Math.round((currentValue / targetValue) * 100), 100);
  }

  private toSnapshot(
    goal: RawGoal,
    config: RawGoalConfig | null,
    currentValue: number,
    currentProgress: number,
  ): GoalSnapshot {
    return {
      id: goal.id,
      title: goal.title,
      category: goal.category,
      metricType: config?.metricType ?? 'UNMAPPED',
      metricKey: config?.metricKey ?? '',
      frequency: config?.frequency ?? 'TOTAL',
      frequencyTarget: this.toNullableNumber(config?.frequencyTarget),
      currentProgress,
      targetValue: this.toNumber(goal.targetValue),
      currentValue,
      targetDate: goal.targetDate?.toISOString() ?? null,
      guidanceText: config?.guidanceText ?? goal.title,
      unit: goal.unit,
      status: goal.status,
    };
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private toNullableNumber(value: Prisma.Decimal | null | undefined) {
    if (value === null || value === undefined) return null;
    return Number(value);
  }
}
