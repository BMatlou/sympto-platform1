import { Injectable } from '@nestjs/common';
import { HealthGoalProgressStatus, Prisma } from '@prisma/client';
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

type GoalConfig = {
  healthGoalId: string;
  metricType: string;
  metricKey: string;
  frequency: 'DAILY' | 'WEEKLY' | 'TOTAL';
  frequencyTarget: number | null;
  guidanceText: string | null;
  aggregation: 'SUM' | 'LATEST' | 'AVERAGE' | 'MIN' | 'MAX';
  comparison: 'AT_LEAST' | 'AT_MOST' | 'CLOSEST' | 'INCREASE_TO' | 'DECREASE_TO';
};

@Injectable()
export class GoalsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMetricEvent(input: GoalMetricEventInput) {
    const occurredAt = input.occurredAt ?? new Date();
    const source = input.source ?? 'unknown';
    if (!Number.isFinite(input.loggedValue)) return [];
    await this.prisma.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${input.patientId} AND "metricType" = ${input.metricType} AND "metricKey" = ${input.metricKey} AND "source" = ${source} AND COALESCE("sourceId", '') = COALESCE(${input.sourceId ?? null}, '')`;
    await this.prisma.$executeRaw`INSERT INTO "HealthGoalMetricEvent" ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId") VALUES (${input.patientId}, ${input.metricType}, ${input.metricKey}, ${input.loggedValue}, ${occurredAt}, ${source}, ${input.sourceId ?? null})`;
    return this.recomputeMatchingGoals(input.patientId, input.metricType, input.metricKey, occurredAt);
  }

  async removeSourceEvents(patientId: string, source: string, sourceId: string) {
    await this.prisma.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "source" = ${source} AND "sourceId" = ${sourceId}`;
  }

  async recomputeMatchingGoals(patientId: string, metricType: string, metricKey: string, now = new Date()) {
    const configs = await this.prisma.$queryRaw<GoalConfig[]>`SELECT c."healthGoalId", c."metricType", c."metricKey", c."frequency", c."frequencyTarget", c."guidanceText", c."aggregation", c."comparison" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE' AND c."metricType" = ${metricType} AND c."metricKey" = ${metricKey}`;
    return this.evaluateConfigs(patientId, configs, now);
  }

  async recomputeAllMatchingGoals(patientId: string, now = new Date()) {
    const configs = await this.prisma.$queryRaw<GoalConfig[]>`SELECT c."healthGoalId", c."metricType", c."metricKey", c."frequency", c."frequencyTarget", c."guidanceText", c."aggregation", c."comparison" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE'`;
    return this.evaluateConfigs(patientId, configs, now);
  }

  async backfillJournalMetrics(patientId: string) {
    await this.prisma.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "source" = 'health-journal'`;
    const mappings: Array<[string, string, string]> = [
      ['WEIGHT', 'weight.kg', '"weightKg"'],
      ['EXERCISE', 'exercise.minutes', '"exerciseMinutes"'],
      ['HYDRATION', 'hydration.ml', '"waterIntakeMl"'],
      ['SLEEP', 'sleep.hours', '"sleepHours"'],
      ['MENTAL_HEALTH', 'mental.stress', '"stressLevel"'],
      ['BLOOD_PRESSURE', 'blood_pressure.systolic', '"bloodPressureSystolic"'],
      ['BLOOD_PRESSURE', 'blood_pressure.diastolic', '"bloodPressureDiastolic"'],
      ['HEART_RATE', 'heart_rate.bpm', '"heartRate"'],
      ['OXYGEN', 'oxygen_saturation.percent', '"oxygenSaturation"'],
      ['RESPIRATION', 'respiratory_rate.bpm', '"respiratoryRate"'],
      ['TEMPERATURE', 'temperature.c', '"temperature"'],
    ];
    for (const [metricType, metricKey, column] of mappings) {
      await this.prisma.$executeRawUnsafe(`INSERT INTO "HealthGoalMetricEvent" ("patientId","metricType","metricKey","loggedValue","occurredAt","source","sourceId") SELECT "patientId", '${metricType}', '${metricKey}', ${column}, "createdAt", 'health-journal', "id" FROM "HealthJournal" WHERE "patientId" = '${patientId}' AND ${column} IS NOT NULL`);
    }
  }

  async backfillPatientProfileMetrics(patientId: string) {
    await this.removeSourceEvents(patientId, 'patient-profile', 'profile');
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId }, select: { weightKg: true, smokingStatus: true, alcoholConsumption: true } });
    if (!patient) return;
    if (patient.weightKg != null) await this.recordMetricEvent({ patientId, metricType: 'WEIGHT', metricKey: 'weight.kg', loggedValue: Number(patient.weightKg), source: 'patient-profile', sourceId: 'profile' });
    const smokingMap: Record<string, number> = { NEVER: 0, FORMER: 0, OCCASIONAL: 1, DAILY: 2 };
    const alcoholMap: Record<string, number> = { NEVER: 0, OCCASIONAL: 1, WEEKLY: 2, DAILY: 3 };
    if (patient.smokingStatus != null) await this.recordMetricEvent({ patientId, metricType: 'SMOKING', metricKey: 'smoking.status', loggedValue: smokingMap[String(patient.smokingStatus)] ?? 0, source: 'patient-profile', sourceId: 'profile' });
    if (patient.alcoholConsumption != null) await this.recordMetricEvent({ patientId, metricType: 'ALCOHOL', metricKey: 'alcohol.frequency', loggedValue: alcoholMap[String(patient.alcoholConsumption)] ?? 0, source: 'patient-profile', sourceId: 'profile' });
  }

  async snapshot(patientId: string) {
    const goals = await this.prisma.healthGoal.findMany({ where: { patientId, status: 'ACTIVE' }, include: { progress: { orderBy: { measuredAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'asc' } });
    const configs = await this.prisma.$queryRaw<GoalConfig[]>`SELECT c."healthGoalId", c."metricType", c."metricKey", c."frequency", c."frequencyTarget", c."guidanceText", c."aggregation", c."comparison" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE'`;
    const byGoal = new Map(configs.map((config) => [config.healthGoalId, config]));
    return goals.map((goal) => ({ ...goal, metricConfig: byGoal.get(goal.id) ?? null }));
  }

  private async evaluateConfigs(patientId: string, configs: GoalConfig[], now: Date) {
    const updated: any[] = [];
    for (const config of configs) {
      const goal = await this.prisma.healthGoal.findUnique({ where: { id: config.healthGoalId } });
      if (!goal || (goal.targetDate && goal.targetDate < now)) continue;
      const start = this.windowStart(config.frequency, goal.createdAt, now);
      const aggregate = await this.aggregateMetric(patientId, config.metricType, config.metricKey, start, now, config.aggregation);
      if (aggregate == null) continue;
      const target = Number(config.frequencyTarget ?? goal.targetValue ?? 0);
      if (!Number.isFinite(target)) continue;
      const evaluated = await this.evaluateValue(patientId, config, start, now, aggregate, target);
      const status = evaluated.achieved ? HealthGoalProgressStatus.ACHIEVED : HealthGoalProgressStatus.IMPROVING;
      await this.prisma.$transaction(async (tx) => {
        await tx.healthGoal.update({ where: { id: goal.id }, data: { currentValue: String(evaluated.currentValue), status: evaluated.achieved ? 'ACHIEVED' : 'ACTIVE', achievedAt: evaluated.achieved ? now : null } });
        await tx.healthGoalProgress.create({ data: { healthGoalId: goal.id, currentValue: String(evaluated.currentValue), progressPercent: String(evaluated.progressPercent.toFixed(2)), status, notes: config.guidanceText ?? `Updated automatically from ${config.metricKey}.`, measuredAt: now } });
      });
      updated.push({ goalId: goal.id, metricType: config.metricType, metricKey: config.metricKey, frequency: config.frequency, target, currentValue: evaluated.currentValue, progressPercent: evaluated.progressPercent, status });
    }
    return updated;
  }

  private async evaluateValue(patientId: string, config: GoalConfig, start: Date, end: Date, value: number, target: number) {
    if (config.metricType === 'WEIGHT' && config.comparison === 'DECREASE_TO') {
      const startingValue = await this.firstMetricValue(patientId, config.metricType, config.metricKey, start, end) ?? value;
      const lowest = await this.minimumMetricValue(patientId, config.metricType, config.metricKey, start, end) ?? value;
      const targetWeight = startingValue - target;
      const actualLoss = startingValue - lowest;
      const progressPercent = target > 0 ? this.cap((actualLoss / target) * 100) : lowest <= targetWeight ? 100 : 0;
      return { currentValue: value, progressPercent, achieved: lowest <= targetWeight };
    }
    if (config.comparison === 'INCREASE_TO' || config.comparison === 'DECREASE_TO') {
      const baseline = await this.firstMetricValue(patientId, config.metricType, config.metricKey, start, end);
      const startingValue = baseline ?? value;
      if (config.comparison === 'INCREASE_TO') {
        const required = target - startingValue;
        const actual = value - startingValue;
        return { currentValue: value, progressPercent: required > 0 ? this.cap((actual / required) * 100) : value >= target ? 100 : 0, achieved: value >= target };
      }
      const required = startingValue - target;
      const actual = startingValue - value;
      return { currentValue: value, progressPercent: required > 0 ? this.cap((actual / required) * 100) : value <= target ? 100 : 0, achieved: value <= target };
    }
    if (config.comparison === 'AT_MOST') return { currentValue: value, progressPercent: target <= 0 ? (value <= target ? 100 : 0) : value <= target ? 100 : this.cap((target / value) * 100), achieved: value <= target };
    if (config.comparison === 'CLOSEST') {
      if (target === 0) return { currentValue: value, progressPercent: value === 0 ? 100 : 0, achieved: value === 0 };
      const errorRatio = Math.abs(value - target) / Math.abs(target);
      return { currentValue: value, progressPercent: this.cap(100 - errorRatio * 100), achieved: errorRatio <= 0.01 };
    }
    return { currentValue: value, progressPercent: target > 0 ? this.cap((value / target) * 100) : 0, achieved: target > 0 && value >= target };
  }

  private async aggregateMetric(patientId: string, metricType: string, metricKey: string, start: Date, end: Date, aggregation: GoalConfig['aggregation']) {
    const expression = aggregation === 'LATEST' ? '(ARRAY_AGG("loggedValue" ORDER BY "occurredAt" DESC))[1]' : aggregation === 'AVERAGE' ? 'AVG("loggedValue")' : aggregation === 'MIN' ? 'MIN("loggedValue")' : aggregation === 'MAX' ? 'MAX("loggedValue")' : 'SUM("loggedValue")';
    const rows = await this.prisma.$queryRaw<Array<{ value: number | null }>>`SELECT ${Prisma.raw(expression)} AS value FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" BETWEEN ${start} AND ${end}`;
    const value = rows[0]?.value;
    return value == null ? null : Number(value);
  }

  private async firstMetricValue(patientId: string, metricType: string, metricKey: string, start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ loggedValue: number }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" BETWEEN ${start} AND ${end} ORDER BY "occurredAt" ASC LIMIT 1`;
    return rows.length ? Number(rows[0].loggedValue) : null;
  }

  private async minimumMetricValue(patientId: string, metricType: string, metricKey: string, start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ value: number | null }>>`SELECT MIN("loggedValue") AS value FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" BETWEEN ${start} AND ${end}`;
    return rows[0]?.value == null ? null : Number(rows[0].value);
  }

  private windowStart(frequency: 'DAILY' | 'WEEKLY' | 'TOTAL', createdAt: Date, now: Date) {
    if (frequency === 'TOTAL') return createdAt;
    const start = new Date(now);
    if (frequency === 'WEEKLY') { const day = start.getDay(); start.setDate(start.getDate() - (day === 0 ? 6 : day - 1)); }
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private cap(value: number) { return Math.min(100, Math.max(0, value)); }
}
