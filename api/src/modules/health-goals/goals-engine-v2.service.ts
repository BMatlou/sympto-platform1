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

type TrackingStrategy = 'DELTA_REDUCTION' | 'CADENCE_ACCUMULATION' | 'TARGET_RANGE_STABILIZATION' | 'ADHERENCE_SCORE' | 'STEP_DOWN_TAPER' | 'TREND_MAPPING';
type StrategyEvaluation = { strategy: TrackingStrategy; currentValue: number; progressPercent: number; achieved: boolean; guidanceText: string };

@Injectable()
export class GoalsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMetricEvent(input: GoalMetricEventInput) {
    const occurredAt = input.occurredAt ?? new Date();
    const source = input.source ?? 'unknown';
    if (!Number.isFinite(input.loggedValue)) return [];

    if (source === 'patient-profile' && input.sourceId === 'profile') {
      const latest = await this.prisma.$queryRaw<Array<{ loggedValue: number | null }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${input.patientId} AND "metricType" = ${input.metricType} AND "metricKey" = ${input.metricKey} AND "source" = ${source} AND "sourceId" = ${input.sourceId} ORDER BY "occurredAt" DESC LIMIT 1`;
      if (latest.length && latest[0]?.loggedValue != null && Number(latest[0].loggedValue) === input.loggedValue) return this.recomputeMatchingGoals(input.patientId, input.metricType, input.metricKey, occurredAt);
      await this.prisma.$executeRaw`INSERT INTO "HealthGoalMetricEvent" ("id", "patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId") VALUES (gen_random_uuid(), ${input.patientId}, ${input.metricType}, ${input.metricKey}, ${input.loggedValue}, ${occurredAt}, ${source}, ${input.sourceId})`;
      return this.recomputeMatchingGoals(input.patientId, input.metricType, input.metricKey, occurredAt);
    }

    await this.prisma.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${input.patientId} AND "metricType" = ${input.metricType} AND "metricKey" = ${input.metricKey} AND "source" = ${source} AND COALESCE("sourceId", '') = COALESCE(${input.sourceId ?? null}, '')`;
    await this.prisma.$executeRaw`INSERT INTO "HealthGoalMetricEvent" ("id", "patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId") VALUES (gen_random_uuid(), ${input.patientId}, ${input.metricType}, ${input.metricKey}, ${input.loggedValue}, ${occurredAt}, ${source}, ${input.sourceId ?? null})`;
    return this.recomputeMatchingGoals(input.patientId, input.metricType, input.metricKey, occurredAt);
  }

  async removeSourceEvents(patientId: string, source: string, sourceId: string) { await this.prisma.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "source" = ${source} AND "sourceId" = ${sourceId}`; }

  private async restoreHistoricalAchievements(patientId: string, metricType: string, metricKey: string, now: Date) {
    const legacy = await this.prisma.$queryRaw<Array<{ healthGoalId: string }>>`SELECT c."healthGoalId" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE' AND c."metricType" = ${metricType} AND c."metricKey" = ${metricKey} AND EXISTS (SELECT 1 FROM "HealthGoalProgress" p WHERE p."healthGoalId" = g."id" AND p."status" = 'ACHIEVED')`;
    if (!legacy.length) return;
    const currentRows = await this.prisma.$queryRaw<Array<{ loggedValue: number | null }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" <= ${now} AND "source" <> 'goal-baseline' ORDER BY "occurredAt" DESC LIMIT 1`;
    const currentValue = currentRows[0]?.loggedValue == null ? null : Number(currentRows[0].loggedValue);
    for (const goal of legacy) await this.prisma.$transaction(async (tx) => {
      await tx.healthGoal.update({ where: { id: goal.healthGoalId }, data: { status: 'ACHIEVED', achievedAt: now, ...(currentValue != null ? { currentValue: String(currentValue) } : {}) } });
      await tx.healthGoalProgress.create({ data: { healthGoalId: goal.healthGoalId, currentValue: currentValue == null ? null : String(currentValue), progressPercent: '100.00', status: HealthGoalProgressStatus.ACHIEVED, notes: `Preserved historical achievement from ${metricKey}.`, measuredAt: now } });
    });
  }

  async recomputeMatchingGoals(patientId: string, metricType: string, metricKey: string, now = new Date()) {
    await this.restoreHistoricalAchievements(patientId, metricType, metricKey, now);
    const configs = await this.prisma.$queryRaw<GoalConfig[]>`SELECT c."healthGoalId", c."metricType", c."metricKey", c."frequency", c."frequencyTarget", c."guidanceText", c."aggregation", c."comparison" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "HealthGoalProgress" p WHERE p."healthGoalId" = g."id" AND p."status" = 'ACHIEVED') AND c."metricType" = ${metricType} AND c."metricKey" = ${metricKey}`;
    return this.evaluateConfigs(patientId, configs, now);
  }

  async recomputeAllMatchingGoals(patientId: string, now = new Date()) {
    for (const metric of [['WEIGHT', 'weight.kg'], ['EXERCISE', 'exercise.minutes'], ['NUTRITION', 'nutrition.calories'], ['BLOOD_PRESSURE', 'blood_pressure.systolic'], ['BLOOD_PRESSURE', 'blood_pressure.diastolic'], ['BLOOD_GLUCOSE', 'blood_glucose.value'], ['CHOLESTEROL', 'cholesterol.total'], ['MEDICATION', 'medication.adherence'], ['SLEEP', 'sleep.hours'], ['MENTAL_HEALTH', 'mental.stress'], ['HYDRATION', 'hydration.ml'], ['SMOKING', 'smoking.cigarettes'], ['ALCOHOL', 'alcohol.drinks'], ['ALCOHOL', 'alcohol.frequency'], ['HEART_RATE', 'heart_rate.bpm']] as const) await this.restoreHistoricalAchievements(patientId, metric[0], metric[1], now);
    const configs = await this.prisma.$queryRaw<GoalConfig[]>`SELECT c."healthGoalId", c."metricType", c."metricKey", c."frequency", c."frequencyTarget", c."guidanceText", c."aggregation", c."comparison" FROM "HealthGoalMetricConfig" c INNER JOIN "HealthGoal" g ON g."id" = c."healthGoalId" WHERE g."patientId" = ${patientId} AND g."status" = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "HealthGoalProgress" p WHERE p."healthGoalId" = g."id" AND p."status" = 'ACHIEVED')`;
    return this.evaluateConfigs(patientId, configs, now);
  }

  async backfillJournalMetrics(patientId: string) {
    await this.prisma.$executeRaw`DELETE FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "source" = 'health-journal'`;
    const mappings: Array<[string, string, string]> = [['WEIGHT', 'weight.kg', '"weightKg"'], ['EXERCISE', 'exercise.minutes', '"exerciseMinutes"'], ['HYDRATION', 'hydration.ml', '"waterIntakeMl"'], ['SLEEP', 'sleep.hours', '"sleepHours"'], ['MENTAL_HEALTH', 'mental.stress', '"stressLevel"'], ['BLOOD_PRESSURE', 'blood_pressure.systolic', '"bloodPressureSystolic"'], ['BLOOD_PRESSURE', 'blood_pressure.diastolic', '"bloodPressureDiastolic"'], ['HEART_RATE', 'heart_rate.bpm', '"heartRate"'], ['OXYGEN', 'oxygen_saturation.percent', '"oxygenSaturation"'], ['RESPIRATION', 'respiratory_rate.bpm', '"respiratoryRate"'], ['TEMPERATURE', 'temperature.c', '"temperature"']];
    for (const [metricType, metricKey, column] of mappings) await this.prisma.$executeRawUnsafe(`INSERT INTO "HealthGoalMetricEvent" ("id","patientId","metricType","metricKey","loggedValue","occurredAt","source","sourceId") SELECT gen_random_uuid(), "patientId", '${metricType}', '${metricKey}', ${column}, "createdAt", 'health-journal', "id" FROM "HealthJournal" WHERE "patientId" = '${patientId}' AND ${column} IS NOT NULL`);
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
      const recurring = config.frequency === 'DAILY' || config.frequency === 'WEEKLY';
      // Daily/weekly goals are interval goals. Meeting one interval target must not
      // permanently complete the journey; the next interval should start fresh.
      const isWeightDirectional = config.metricType === 'WEIGHT'
        && (config.comparison === 'INCREASE_TO' || config.comparison === 'DECREASE_TO');
      const progressStatus = evaluated.achieved
        ? recurring ? HealthGoalProgressStatus.ON_TRACK : HealthGoalProgressStatus.ACHIEVED
        : isWeightDirectional
          ? evaluated.progressPercent < -0.01
            ? HealthGoalProgressStatus.DECLINING
            : evaluated.progressPercent > 0.01
              ? HealthGoalProgressStatus.IMPROVING
              : HealthGoalProgressStatus.STAGNANT
          : HealthGoalProgressStatus.IMPROVING;
      const terminal = evaluated.achieved && !recurring;
      const progressPercentText = evaluated.progressPercent.toFixed(2);
      const latestProgress = await this.prisma.healthGoalProgress.findFirst({
        where: { healthGoalId: goal.id },
        orderBy: { measuredAt: 'desc' },
        select: { currentValue: true, progressPercent: true, status: true },
      });
      const sameProgress =
        latestProgress != null &&
        Number(latestProgress.currentValue ?? NaN) === Number(evaluated.currentValue) &&
        String(latestProgress.progressPercent ?? '') === progressPercentText &&
        latestProgress.status === progressStatus;

      await this.prisma.$transaction(async (tx) => {
        await tx.healthGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: String(evaluated.currentValue),
            status: terminal ? 'ACHIEVED' : 'ACTIVE',
            achievedAt: terminal ? now : null,
          },
        });
        if (!sameProgress) {
          await tx.healthGoalProgress.create({
            data: {
              healthGoalId: goal.id,
              currentValue: String(evaluated.currentValue),
              progressPercent: progressPercentText,
              status: progressStatus,
              notes: recurring && evaluated.achieved
                ? `${evaluated.guidanceText} Target met for this ${config.frequency.toLowerCase()} interval.`
                : evaluated.guidanceText,
              measuredAt: now,
            },
          });
        }
      });
      updated.push({ goalId: goal.id, metricType: config.metricType, metricKey: config.metricKey, frequency: config.frequency, strategy: evaluated.strategy, target, currentValue: evaluated.currentValue, progressPercent: evaluated.progressPercent, status: progressStatus, guidanceText: evaluated.guidanceText });
    }
    return updated;
  }

  private strategyFor(config: GoalConfig): TrackingStrategy {
    switch (config.metricType) {
      case 'WEIGHT': return 'DELTA_REDUCTION';
      case 'EXERCISE': case 'HYDRATION': return 'CADENCE_ACCUMULATION';
      case 'BLOOD_PRESSURE': case 'BLOOD_GLUCOSE': case 'CHOLESTEROL': case 'NUTRITION': case 'SLEEP': return 'TARGET_RANGE_STABILIZATION';
      case 'MEDICATION': return 'ADHERENCE_SCORE';
      case 'SMOKING': case 'ALCOHOL': return 'STEP_DOWN_TAPER';
      default: return 'TREND_MAPPING';
    }
  }

  private strategyWindow(config: GoalConfig, goalCreatedAt: Date, now: Date) {
    if (config.frequency === 'DAILY') return this.southAfricaDayWindow(now);
    if (config.frequency === 'WEEKLY') return this.southAfricaWeekWindow(now);
    return { start: goalCreatedAt, end: now };
  }

  private southAfricaDayWindow(value: Date) {
    const dateKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
    const start = new Date(`${dateKey}T00:00:00+02:00`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end: end > value ? value : end };
  }

  private southAfricaWeekWindow(value: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);
    const localDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = localDate.getUTCDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    localDate.setUTCDate(localDate.getUTCDate() - daysFromMonday);
    const weekKey = localDate.toISOString().slice(0, 10);
    const start = new Date(`${weekKey}T00:00:00+02:00`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end: end > value ? value : end };
  }

  private async aggregateMetric(patientId: string, metricType: string, metricKey: string, start: Date, end: Date, aggregation: GoalConfig['aggregation']) {
    const rows = await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "source" <> 'goal-baseline' AND "occurredAt" >= ${start} AND "occurredAt" <= ${end} ORDER BY "occurredAt" ASC`;
    if (!rows.length) return null;
    const values = rows.map((row) => Number(row.loggedValue)).filter(Number.isFinite);
    if (!values.length) return null;
    switch (aggregation) { case 'SUM': return values.reduce((sum, value) => sum + value, 0); case 'AVERAGE': return values.reduce((sum, value) => sum + value, 0) / values.length; case 'MIN': return Math.min(...values); case 'MAX': return Math.max(...values); case 'LATEST': default: return values[values.length - 1]; }
  }

  private async evaluateWeightStrategy(patientId: string, title: string, config: GoalConfig, goalCreatedAt: Date, now: Date, target: number): Promise<StrategyEvaluation> {
    const baselineRows = await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = 'WEIGHT' AND "metricKey" = 'weight.kg' AND "source" = 'goal-baseline' AND "sourceId" = ${config.healthGoalId} LIMIT 1`;
    const historicalRows = !baselineRows.length && !Number.isNaN(goalCreatedAt.getTime())
      ? await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = 'WEIGHT' AND "metricKey" = 'weight.kg' AND "source" <> 'goal-baseline' AND "occurredAt" <= ${goalCreatedAt} ORDER BY "occurredAt" DESC LIMIT 1`
      : [];
    const latestRows = await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = 'WEIGHT' AND "metricKey" = 'weight.kg' AND "source" <> 'goal-baseline' AND "occurredAt" <= ${now} ORDER BY "occurredAt" DESC LIMIT 1`;
    const baseline = baselineRows.length ? Number(baselineRows[0].loggedValue) : historicalRows.length ? Number(historicalRows[0].loggedValue) : latestRows.length ? Number(latestRows[0].loggedValue) : null;
    const latest = latestRows.length ? Number(latestRows[0].loggedValue) : baseline;
    if (baseline == null || latest == null || !Number.isFinite(baseline) || !Number.isFinite(latest) || target < 0) return { strategy: 'DELTA_REDUCTION', currentValue: latest ?? baseline ?? 0, progressPercent: 0, achieved: false, guidanceText: `${title}: keep tracking weight toward the target.` };
    if (config.comparison === 'CLOSEST') {
      const targetWeight = baseline;
      const deviation = Math.abs(latest - targetWeight);
      const maintenanceToleranceKg = Math.max(0.5, Math.abs(baseline) * 0.02);
      const stabilityProgressPercent = Math.max(0, Math.min(100, (1 - (deviation / Math.max(Math.abs(baseline), 0.0001))) * 100));
      const guidanceText = deviation <= maintenanceToleranceKg
        ? title + ': weight is within the maintenance range around your ' + targetWeight.toFixed(1) + ' kg baseline. Keep tracking your current weight.'
        : title + ': weight is ' + deviation.toFixed(1) + ' kg from the maintenance baseline of ' + targetWeight.toFixed(1) + ' kg. Keep tracking the trend and review a sustained change.';
      // Maintenance is an ongoing state: progress represents stability around the baseline,
      // not elapsed time. A small change therefore produces a visible change in the score.
      return { strategy: 'DELTA_REDUCTION', currentValue: latest, progressPercent: stabilityProgressPercent, achieved: false, guidanceText };
    }
    // Directional weight targets represent the requested amount of change.
    // INCREASE_TO + target=100 means "gain 100 kg from baseline".
    // DECREASE_TO + target=20 means "lose 20 kg from baseline".
    const requestedChangeKg = Math.max(target, 0);
    const targetWeight = config.comparison === 'INCREASE_TO'
      ? baseline + requestedChangeKg
      : baseline - requestedChangeKg;
    const directedMovement = config.comparison === 'INCREASE_TO'
      ? latest - baseline
      : baseline - latest;
    const progressPercent = requestedChangeKg === 0
      ? Math.abs(latest - targetWeight) <= 0.5 ? 100 : 0
      : Math.max(-100, Math.min(100, (directedMovement / requestedChangeKg) * 100));
    const achieved = config.comparison === 'INCREASE_TO'
      ? latest >= targetWeight
      : latest <= targetWeight;
    const guidanceText = achieved
      ? title + ': requested ' + (config.comparison === 'INCREASE_TO' ? 'gain' : 'loss') + ' of ' + requestedChangeKg.toFixed(1) + ' kg reached at ' + targetWeight.toFixed(1) + ' kg.'
      : directedMovement < 0
        ? title + ': your current weight has moved ' + Math.abs(directedMovement).toFixed(1) + ' kg away from the planned ' + (config.comparison === 'INCREASE_TO' ? 'gain' : 'loss') + ' direction.'
        : title + ': ' + (config.comparison === 'INCREASE_TO' ? 'gain' : 'loss') + ' ' + requestedChangeKg.toFixed(1) + ' kg from your ' + baseline.toFixed(1) + ' kg baseline toward ' + targetWeight.toFixed(1) + ' kg.';
    return { strategy: 'DELTA_REDUCTION', currentValue: latest, progressPercent: achieved ? 100 : progressPercent, achieved, guidanceText };
  }
  private async evaluateStrategy(patientId: string, title: string, config: GoalConfig, goalCreatedAt: Date, start: Date, now: Date, aggregate: number, target: number, strategy: TrackingStrategy): Promise<StrategyEvaluation> {
    if (strategy === 'DELTA_REDUCTION') return this.evaluateWeightStrategy(patientId, title, config, goalCreatedAt, now, target);
    const history = await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal; occurredAt: Date }>>`SELECT "loggedValue", "occurredAt" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${config.metricType} AND "metricKey" = ${config.metricKey} AND "occurredAt" >= ${goalCreatedAt} AND "occurredAt" <= ${now} ORDER BY "occurredAt" ASC`;
    const values = history.map((row) => Number(row.loggedValue)).filter(Number.isFinite);
    const latest = values.length ? values[values.length - 1] : aggregate;
    let progressPercent = 0; let achieved = false; let currentValue = latest;
    if (strategy === 'STEP_DOWN_TAPER') {
      const baseline = values.length ? values[0] : aggregate;
      const reduction = baseline - latest;
      progressPercent = baseline === 0
        ? (config.comparison === 'AT_MOST' && latest <= target ? 100 : 0)
        : Math.max(0, Math.min(100, (reduction / Math.abs(baseline)) * 100));
      achieved = config.comparison === 'AT_MOST' ? aggregate <= target : latest <= target;
    } else if (strategy === 'CADENCE_ACCUMULATION') {
      currentValue = aggregate;
      if (config.comparison === 'AT_LEAST') {
        progressPercent = target <= 0 ? 100 : Math.max(0, Math.min(100, (aggregate / target) * 100));
        achieved = aggregate >= target;
      } else {
        progressPercent = target <= 0 ? (aggregate <= 0 ? 100 : 0) : aggregate <= target ? 100 : Math.max(0, Math.min(100, (target / aggregate) * 100));
        achieved = aggregate <= target;
      }
    } else if (strategy === 'ADHERENCE_SCORE') {
      currentValue = aggregate;
      progressPercent = Math.max(0, Math.min(100, aggregate));
      achieved = aggregate >= target;
    } else if (strategy === 'TARGET_RANGE_STABILIZATION') {
      currentValue = config.aggregation === 'SUM' ? aggregate : latest;
      const comparisonValue = currentValue;
      if (config.comparison === 'AT_LEAST') {
        progressPercent = target <= 0 ? 100 : comparisonValue >= target ? 100 : Math.max(0, Math.min(100, (comparisonValue / target) * 100));
        achieved = comparisonValue >= target;
      } else if (config.comparison === 'AT_MOST') {
        progressPercent = target <= 0
          ? (comparisonValue <= 0 ? 100 : 0)
          : comparisonValue <= target
            ? 100
            : Math.max(0, Math.min(100, (target / comparisonValue) * 100));
        achieved = comparisonValue <= target;
      } else {
        const tolerance = Math.max(0.5, Math.abs(target) * 0.05);
        progressPercent = target <= 0
          ? (Math.abs(comparisonValue) <= tolerance ? 100 : 0)
          : Math.max(0, Math.min(100, (1 - (Math.abs(comparisonValue - target) / Math.max(Math.abs(target), 1))) * 100));
        achieved = Math.abs(comparisonValue - target) <= tolerance;
      }
    } else {
      currentValue = latest;
      if (config.comparison === 'AT_MOST') {
        progressPercent = target <= 0
          ? (latest <= 0 ? 100 : 0)
          : latest <= target ? 100 : Math.max(0, Math.min(100, (target / latest) * 100));
        achieved = latest <= target;
      } else if (config.comparison === 'AT_LEAST') {
        progressPercent = target <= 0 ? 100 : Math.max(0, Math.min(100, (latest / target) * 100));
        achieved = latest >= target;
      } else {
        const tolerance = Math.max(0.5, Math.abs(target) * 0.05);
        progressPercent = target <= 0
          ? (Math.abs(latest) <= tolerance ? 100 : 0)
          : Math.max(0, Math.min(100, (1 - (Math.abs(latest - target) / Math.max(Math.abs(target), 1))) * 100));
        achieved = Math.abs(latest - target) <= tolerance;
      }
    }
    const guidanceText = achieved ? `${title}: target met based on ${config.metricKey}.` : `${title}: keep tracking ${config.metricKey} toward the target.`;
    return { strategy, currentValue, progressPercent, achieved, guidanceText };
  }
}