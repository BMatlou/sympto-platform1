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

type TrackingStrategy =
  | 'DELTA_REDUCTION'
  | 'CADENCE_ACCUMULATION'
  | 'TARGET_RANGE_STABILIZATION'
  | 'ADHERENCE_SCORE'
  | 'STEP_DOWN_TAPER'
  | 'TREND_MAPPING';

type StrategyEvaluation = {
  strategy: TrackingStrategy;
  currentValue: number;
  progressPercent: number;
  achieved: boolean;
  guidanceText: string;
};

@Injectable()
export class GoalsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMetricEvent(input: GoalMetricEventInput) {
    const occurredAt = input.occurredAt ?? new Date();
    const source = input.source ?? 'unknown';
    if (!Number.isFinite(input.loggedValue)) return [];

    if (source === 'patient-profile' && input.sourceId === 'profile') {
      const latest = await this.prisma.$queryRaw<Array<{ loggedValue: number | null }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${input.patientId} AND "metricType" = ${input.metricType} AND "metricKey" = ${input.metricKey} AND "source" = ${source} AND "sourceId" = ${input.sourceId} ORDER BY "occurredAt" DESC LIMIT 1`;
      if (latest.length && latest[0]?.loggedValue != null && Number(latest[0].loggedValue) === input.loggedValue) {
        return this.recomputeMatchingGoals(input.patientId, input.metricType, input.metricKey, occurredAt);
      }
      await this.prisma.$executeRaw`INSERT INTO "HealthGoalMetricEvent" ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId") VALUES (${input.patientId}, ${input.metricType}, ${input.metricKey}, ${input.loggedValue}, ${occurredAt}, ${source}, ${input.sourceId})`;
      return this.recomputeMatchingGoals(input.patientId, input.metricType, input.metricKey, occurredAt);
    }

    await this.prisma.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${input.patientId} AND "metricType" = ${input.metricType} AND "metricKey" = ${input.metricKey} AND "source" = ${source} AND COALESCE("sourceId", '') = COALESCE(${input.sourceId ?? null}, '')`;
    await this.prisma.$executeRaw`INSERT INTO "HealthGoalMetricEvent" ("patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId") VALUES (${input.patientId}, ${input.metricType}, ${input.metricKey}, ${input.loggedValue}, ${occurredAt}, ${source}, ${input.sourceId ?? null})`;
    return this.recomputeMatchingGoals(input.patientId, input.metricType, input.metricKey, occurredAt);
  }

  async removeSourceEvents(patientId: string, source: string, sourceId: string) {
    await this.prisma.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "source" = ${source} AND "sourceId" = ${sourceId}`;
  }

  private async restoreHistoricalAchievements(patientId: string, metricType: string, metricKey: string, now: Date) {
    const legacy = await this.prisma.$queryRaw<Array<{ healthGoalId: string }>>`SELECT c."healthGoalId" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE' AND c."metricType" = ${metricType} AND c."metricKey" = ${metricKey} AND EXISTS (SELECT 1 FROM "HealthGoalProgress" p WHERE p."healthGoalId" = g."id" AND p."status" = 'ACHIEVED')`;
    if (!legacy.length) return;

    const currentRows = await this.prisma.$queryRaw<Array<{ loggedValue: number | null }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" <= ${now} ORDER BY "occurredAt" DESC LIMIT 1`;
    const currentValue = currentRows[0]?.loggedValue == null ? null : Number(currentRows[0].loggedValue);

    for (const goal of legacy) {
      await this.prisma.$transaction(async (tx) => {
        await tx.healthGoal.update({
          where: { id: goal.healthGoalId },
          data: {
            status: 'ACHIEVED',
            achievedAt: now,
            ...(currentValue != null ? { currentValue: String(currentValue) } : {}),
          },
        });
        await tx.healthGoalProgress.create({
          data: {
            healthGoalId: goal.healthGoalId,
            currentValue: currentValue == null ? null : String(currentValue),
            progressPercent: '100.00',
            status: HealthGoalProgressStatus.ACHIEVED,
            notes: `Preserved historical achievement from ${metricKey}.`,
            measuredAt: now,
          },
        });
      });
    }
  }

  async recomputeMatchingGoals(patientId: string, metricType: string, metricKey: string, now = new Date()) {
    await this.restoreHistoricalAchievements(patientId, metricType, metricKey, now);
    const configs = await this.prisma.$queryRaw<GoalConfig[]>`SELECT c."healthGoalId", c."metricType", c."metricKey", c."frequency", c."frequencyTarget", c."guidanceText", c."aggregation", c."comparison" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "HealthGoalProgress" p WHERE p."healthGoalId" = g."id" AND p."status" = 'ACHIEVED') AND c."metricType" = ${metricType} AND c."metricKey" = ${metricKey}`;
    return this.evaluateConfigs(patientId, configs, now);
  }

  async recomputeAllMatchingGoals(patientId: string, now = new Date()) {
    for (const metric of [['WEIGHT', 'weight.kg'], ['EXERCISE', 'exercise.minutes'], ['NUTRITION', 'nutrition.calories'], ['BLOOD_PRESSURE', 'blood_pressure.systolic'], ['BLOOD_PRESSURE', 'blood_pressure.diastolic'], ['BLOOD_GLUCOSE', 'blood_glucose.value'], ['CHOLESTEROL', 'cholesterol.total'], ['MEDICATION', 'medication.adherence'], ['SLEEP', 'sleep.hours'], ['MENTAL_HEALTH', 'mental.stress'], ['HYDRATION', 'hydration.ml'], ['SMOKING', 'smoking.cigarettes'], ['ALCOHOL', 'alcohol.frequency'], ['HEART_RATE', 'heart_rate.bpm']] as const) {
      await this.restoreHistoricalAchievements(patientId, metric[0], metric[1], now);
    }
    const configs = await this.prisma.$queryRaw<GoalConfig[]>`SELECT c."healthGoalId", c."metricType", c."metricKey", c."frequency", c."frequencyTarget", c."guidanceText", c."aggregation", c."comparison" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "HealthGoalProgress" p WHERE p."healthGoalId" = g."id" AND p."status" = 'ACHIEVED')`;
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
    if (patient.smokingStatus != null) await this.recordMetricEvent({ patientId, metricType: 'SMOKING_PROFILE', metricKey: 'smoking.status', loggedValue: smokingMap[String(patient.smokingStatus)] ?? 0, source: 'patient-profile', sourceId: 'profile' });
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

      const strategy = this.strategyFor(config);
      const window = this.strategyWindow(config, goal.createdAt, now);
      const aggregation = strategy === 'TARGET_RANGE_STABILIZATION' ? 'LATEST' : config.aggregation;
      const aggregate = await this.aggregateMetric(patientId, config.metricType, config.metricKey, window.start, now, aggregation);
      if (aggregate == null) continue;

      const target = Number(config.frequencyTarget ?? goal.targetValue ?? 0);
      if (!Number.isFinite(target)) continue;

      const evaluated = await this.evaluateStrategy(patientId, goal.title, config, goal.createdAt, window.start, now, aggregate, target, strategy);
      const status = evaluated.achieved ? HealthGoalProgressStatus.ACHIEVED : HealthGoalProgressStatus.IMPROVING;

      await this.prisma.$transaction(async (tx) => {
        await tx.healthGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: String(evaluated.currentValue),
            status: evaluated.achieved ? 'ACHIEVED' : 'ACTIVE',
            achievedAt: evaluated.achieved ? now : null,
          },
        });
        await tx.healthGoalProgress.create({
          data: {
            healthGoalId: goal.id,
            currentValue: String(evaluated.currentValue),
            progressPercent: String(evaluated.progressPercent.toFixed(2)),
            status,
            notes: evaluated.guidanceText,
            measuredAt: now,
          },
        });
      });

      updated.push({
        goalId: goal.id,
        metricType: config.metricType,
        metricKey: config.metricKey,
        frequency: config.frequency,
        strategy: evaluated.strategy,
        target,
        currentValue: evaluated.currentValue,
        progressPercent: evaluated.progressPercent,
        status,
        guidanceText: evaluated.guidanceText,
      });
    }

    return updated;
  }

  private strategyFor(config: GoalConfig): TrackingStrategy {
    switch (config.metricType) {
      case 'WEIGHT':
        return 'DELTA_REDUCTION';
      case 'EXERCISE':
      case 'HYDRATION':
        return 'CADENCE_ACCUMULATION';
      case 'BLOOD_PRESSURE':
      case 'BLOOD_GLUCOSE':
      case 'CHOLESTEROL':
      case 'NUTRITION':
      case 'SLEEP':
      case 'HEART_RATE':
        return 'TARGET_RANGE_STABILIZATION';
      case 'MEDICATION':
        return 'ADHERENCE_SCORE';
      case 'SMOKING':
        return 'STEP_DOWN_TAPER';
      case 'MENTAL_HEALTH':
      case 'OTHER':
        return 'TREND_MAPPING';
      default:
        return config.comparison === 'DECREASE_TO' || config.comparison === 'INCREASE_TO'
          ? 'DELTA_REDUCTION'
          : 'CADENCE_ACCUMULATION';
    }
  }

  private strategyWindow(config: GoalConfig, createdAt: Date, now: Date) {
    if (this.strategyFor(config) === 'TARGET_RANGE_STABILIZATION') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    return { start: this.windowStart(config.frequency, createdAt, now), end: now };
  }

  private async evaluateStrategy(
    patientId: string,
    goalTitle: string,
    config: GoalConfig,
    createdAt: Date,
    start: Date,
    end: Date,
    value: number,
    target: number,
    strategy: TrackingStrategy,
  ): Promise<StrategyEvaluation> {
    switch (strategy) {
      case 'DELTA_REDUCTION':
        return this.evaluateDeltaReduction(patientId, goalTitle, config, start, end, value, target);
      case 'CADENCE_ACCUMULATION':
        return this.evaluateCadence(config, value, target);
      case 'TARGET_RANGE_STABILIZATION':
        return this.evaluateRangeStabilization(patientId, config, start, end, target, value);
      case 'ADHERENCE_SCORE':
        return this.evaluateAdherence(value, target);
      case 'STEP_DOWN_TAPER':
        return this.evaluateSmokingTaper(patientId, config, createdAt, end, value, target);
      case 'TREND_MAPPING':
        return this.evaluateTrendMapping(patientId, config, end, value, target);
    }
  }

  private async evaluateDeltaReduction(
    patientId: string,
    goalTitle: string,
    config: GoalConfig,
    start: Date,
    end: Date,
    currentValue: number,
    target: number,
  ): Promise<StrategyEvaluation> {
    const startingValue = await this.firstMetricValue(patientId, config.metricType, config.metricKey, start, end) ?? currentValue;
    const denominator = startingValue - target;
    const progressPercent = Math.abs(denominator) < 0.000001
      ? (currentValue <= target ? 100 : 0)
      : this.cap(((startingValue - currentValue) / denominator) * 100);
    const achieved = config.comparison === 'INCREASE_TO' ? currentValue >= target : currentValue <= target;
    const direction = achieved ? 'Target reached.' : currentValue <= startingValue ? 'Closing the gap.' : 'Moving away from target.';
    const remaining = Math.abs(currentValue - target);
    const dateText = this.formatTargetDate(end);
    const guidanceText = goalTitle.toLowerCase().includes('weight')
      ? `Weight is ${this.formatNumber(currentValue)}kg. ${this.formatNumber(remaining)}kg left to your target by ${dateText}. ${direction}`
      : `${goalTitle}: ${this.formatNumber(currentValue)}. ${this.formatNumber(remaining)} remaining to target. ${direction}`;

    return { strategy: 'DELTA_REDUCTION', currentValue, progressPercent, achieved, guidanceText };
  }

  private evaluateCadence(config: GoalConfig, currentValue: number, target: number): StrategyEvaluation {
    const progressPercent = config.comparison === 'AT_MOST'
      ? target <= 0 ? (currentValue <= target ? 100 : 0) : this.cap((target / Math.max(currentValue, target)) * 100)
      : target > 0 ? this.cap((currentValue / target) * 100) : 0;
    const remaining = Math.max(0, target - currentValue);
    const unit = config.metricType === 'EXERCISE' ? 'minutes' : 'ml';
    const cadenceLabel = config.metricType === 'EXERCISE' ? 'this week' : 'today';
    const guidanceText = config.comparison === 'AT_MOST'
      ? `${this.formatNumber(currentValue)} ${unit} logged ${cadenceLabel}. Keep below your ${this.formatNumber(target)} ${unit} target.`
      : `${this.formatNumber(currentValue)} ${unit} logged ${cadenceLabel}. ${this.formatNumber(remaining)} ${unit} left to hit your target.`;

    return { strategy: 'CADENCE_ACCUMULATION', currentValue, progressPercent, achieved: false, guidanceText };
  }

  private async evaluateRangeStabilization(
    patientId: string,
    config: GoalConfig,
    start: Date,
    end: Date,
    target: number,
    latestValue: number,
  ): Promise<StrategyEvaluation> {
    const dailyRows = await this.dailyLatestMetricValues(patientId, config.metricType, config.metricKey, start, end);
    if (!dailyRows.length) {
      return {
        strategy: 'TARGET_RANGE_STABILIZATION',
        currentValue: latestValue,
        progressPercent: 0,
        achieved: false,
        guidanceText: 'No recent readings yet. Log your metric to begin the 30-day stability score.',
      };
    }

    const inRange = dailyRows.filter(({ value }) => this.isWithinTarget(value, target, config.comparison)).length;
    const monitoredDays = dailyRows.length;
    const compliancePercent = this.cap((inRange / monitoredDays) * 100);
    const guidanceText = this.rangeGuidance(config.metricType, compliancePercent, latestValue, target, monitoredDays);

    return {
      strategy: 'TARGET_RANGE_STABILIZATION',
      currentValue: latestValue,
      progressPercent: compliancePercent,
      achieved: false,
      guidanceText,
    };
  }

  private evaluateAdherence(currentValue: number, target: number): StrategyEvaluation {
    const adherence = this.cap(currentValue);
    const guidanceText = `Medication adherence is ${this.formatNumber(adherence)}% this week against a ${this.formatNumber(target)}% target.`;
    return {
      strategy: 'ADHERENCE_SCORE',
      currentValue: adherence,
      progressPercent: target > 0 ? this.cap((adherence / target) * 100) : adherence,
      achieved: false,
      guidanceText,
    };
  }

  private async evaluateSmokingTaper(
    patientId: string,
    config: GoalConfig,
    createdAt: Date,
    now: Date,
    currentValue: number,
    target: number,
  ): Promise<StrategyEvaluation> {
    const startingValue = await this.firstMetricValue(patientId, config.metricType, config.metricKey, createdAt, now) ?? currentValue;
    const dailyRows = await this.metricValues(patientId, config.metricType, config.metricKey, createdAt, now);
    const compliant = dailyRows.filter((row) => row.value <= this.taperCeilingAt(createdAt, target, startingValue, row.occurredAt)).length;
    const compliancePercent = dailyRows.length ? this.cap((compliant / dailyRows.length) * 100) : 0;
    const reductionProgress = startingValue > target
      ? this.cap(((startingValue - currentValue) / (startingValue - target)) * 100)
      : currentValue <= target ? 100 : 0;
    const progressPercent = this.cap((compliancePercent * 0.7) + (reductionProgress * 0.3));
    const elapsedWeeks = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const ceiling = Math.max(target, startingValue - elapsedWeeks);
    const achieved = target === 0 && currentValue <= 0;
    const guidanceText = currentValue <= ceiling
      ? `Stayed below your daily ceiling of ${this.formatNumber(ceiling)} cigarettes today. Step-down target is ${this.formatNumber(target)} cigarettes/day.`
      : `Today is above your ${this.formatNumber(ceiling)}-cigarette daily ceiling. Keep the next logged values at or below the step-down target.`;

    return { strategy: 'STEP_DOWN_TAPER', currentValue, progressPercent, achieved, guidanceText };
  }

  private async evaluateTrendMapping(
    patientId: string,
    config: GoalConfig,
    end: Date,
    currentValue: number,
    target: number,
  ): Promise<StrategyEvaluation> {
    const recentStart = new Date(end);
    recentStart.setDate(recentStart.getDate() - 6);
    recentStart.setHours(0, 0, 0, 0);
    const priorEnd = new Date(recentStart.getTime() - 1);
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - 6);
    priorStart.setHours(0, 0, 0, 0);

    const recent = await this.averageMetricValue(patientId, config.metricType, config.metricKey, recentStart, end);
    const prior = await this.averageMetricValue(patientId, config.metricType, config.metricKey, priorStart, priorEnd);
    const recentAverage = recent ?? currentValue;
    const priorAverage = prior ?? recentAverage;
    const currentDistance = Math.abs(recentAverage - target);
    const priorDistance = Math.abs(priorAverage - target);
    const progressPercent = priorDistance > 0
      ? this.cap(((priorDistance - currentDistance) / priorDistance) * 100)
      : recentAverage === target ? 100 : 50;
    const direction = currentDistance < priorDistance ? 'improving' : currentDistance > priorDistance ? 'moving away from target' : 'holding steady';
    const guidanceText = `${config.metricType === 'MENTAL_HEALTH' ? 'Your recent mental-health trend' : 'Your recent goal trend'} is ${direction}: ${this.formatNumber(recentAverage)} average versus ${this.formatNumber(priorAverage)} previously.`;

    return {
      strategy: 'TREND_MAPPING',
      currentValue,
      progressPercent,
      achieved: false,
      guidanceText,
    };
  }

  private async aggregateMetric(patientId: string, metricType: string, metricKey: string, start: Date, end: Date, aggregation: GoalConfig['aggregation']) {
    const expression = aggregation === 'LATEST'
      ? '(ARRAY_AGG("loggedValue" ORDER BY "occurredAt" DESC))[1]'
      : aggregation === 'AVERAGE'
        ? 'AVG("loggedValue")'
        : aggregation === 'MIN'
          ? 'MIN("loggedValue")'
          : aggregation === 'MAX'
            ? 'MAX("loggedValue")'
            : 'SUM("loggedValue")';
    const rows = await this.prisma.$queryRaw<Array<{ value: number | null }>>`SELECT ${Prisma.raw(expression)} AS value FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" BETWEEN ${start} AND ${end}`;
    const value = rows[0]?.value;
    return value == null ? null : Number(value);
  }

  private async firstMetricValue(patientId: string, metricType: string, metricKey: string, start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ loggedValue: number }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" BETWEEN ${start} AND ${end} ORDER BY "occurredAt" ASC LIMIT 1`;
    return rows.length ? Number(rows[0].loggedValue) : null;
  }

  private async averageMetricValue(patientId: string, metricType: string, metricKey: string, start: Date, end: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ value: number | null }>>`SELECT AVG("loggedValue") AS value FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" BETWEEN ${start} AND ${end}`;
    return rows[0]?.value == null ? null : Number(rows[0].value);
  }

  private async dailyLatestMetricValues(patientId: string, metricType: string, metricKey: string, start: Date, end: Date) {
    return this.prisma.$queryRaw<Array<{ day: Date; value: number }>>`SELECT "day", "loggedValue" AS value FROM (SELECT DATE_TRUNC('day', "occurredAt") AS "day", "loggedValue", ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('day', "occurredAt") ORDER BY "occurredAt" DESC) AS rn FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" BETWEEN ${start} AND ${end}) x WHERE rn = 1 ORDER BY "day" ASC`;
  }

  private async metricValues(patientId: string, metricType: string, metricKey: string, start: Date, end: Date) {
    return this.prisma.$queryRaw<Array<{ occurredAt: Date; value: number }>>`SELECT "occurredAt", "loggedValue" AS value FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" BETWEEN ${start} AND ${end} ORDER BY "occurredAt" ASC`;
  }

  private taperCeilingAt(createdAt: Date, target: number, startingValue: number, occurredAt: Date) {
    const elapsedWeeks = Math.max(0, Math.floor((occurredAt.getTime() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    return Math.max(target, startingValue - elapsedWeeks);
  }

  private isWithinTarget(value: number, target: number, comparison: GoalConfig['comparison']) {
    if (comparison === 'AT_MOST') return value <= target;
    if (comparison === 'AT_LEAST') return value >= target;
    if (comparison === 'INCREASE_TO') return value >= target;
    if (comparison === 'DECREASE_TO') return value <= target;
    const tolerance = Math.abs(target) * 0.01;
    return tolerance === 0 ? value === 0 : Math.abs(value - target) <= tolerance;
  }

  private rangeGuidance(metricType: string, compliancePercent: number, latestValue: number, target: number, monitoredDays: number) {
    const label = metricType === 'BLOOD_PRESSURE'
      ? 'Vitals'
      : metricType === 'BLOOD_GLUCOSE'
        ? 'Glucose'
        : metricType === 'CHOLESTEROL'
          ? 'Cholesterol'
          : metricType === 'HEART_RATE'
            ? 'Heart rate'
            : metricType === 'SLEEP'
              ? 'Sleep'
              : 'Nutrition';
    return `${label} stable: ${this.formatNumber(compliancePercent)}% of ${monitoredDays} monitored days were within your target boundary. Latest: ${this.formatNumber(latestValue)} (target ${this.formatNumber(target)}).`;
  }

  private windowStart(frequency: 'DAILY' | 'WEEKLY' | 'TOTAL', createdAt: Date, now: Date) {
    if (frequency === 'TOTAL') return createdAt;
    const start = new Date(now);
    if (frequency === 'WEEKLY') {
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    }
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private formatTargetDate(date: Date) {
    return new Intl.DateTimeFormat('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }

  private formatNumber(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  private cap(value: number) {
    return Math.min(100, Math.max(0, value));
  }
}
