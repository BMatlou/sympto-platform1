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
    for (const metric of [['WEIGHT', 'weight.kg'], ['EXERCISE', 'exercise.minutes'], ['NUTRITION', 'nutrition.calories'], ['BLOOD_PRESSURE', 'blood_pressure.systolic'], ['BLOOD_PRESSURE', 'blood_pressure.diastolic'], ['BLOOD_GLUCOSE', 'blood_glucose.value'], ['CHOLESTEROL', 'cholesterol.total'], ['MEDICATION', 'medication.adherence'], ['SLEEP', 'sleep.hours'], ['MENTAL_HEALTH', 'mental.stress'], ['HYDRATION', 'hydration.ml'], ['SMOKING', 'smoking.cigarettes'], ['ALCOHOL', 'alcohol.frequency'], ['HEART_RATE', 'heart_rate.bpm']] as const) await this.restoreHistoricalAchievements(patientId, metric[0], metric[1], now);
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
      const progressStatus = evaluated.achieved
        ? recurring ? HealthGoalProgressStatus.ON_TRACK : HealthGoalProgressStatus.ACHIEVED
        : HealthGoalProgressStatus.IMPROVING;
      const terminal = evaluated.achieved && !recurring;
      await this.prisma.$transaction(async (tx) => {
        await tx.healthGoal.update({
          where: { id: goal.id },
          data: {
            currentValue: String(evaluated.currentValue),
            status: terminal ? 'ACHIEVED' : 'ACTIVE',
            achievedAt: terminal ? now : null,
          },
        });
        await tx.healthGoalProgress.create({
          data: {
            healthGoalId: goal.id,
            currentValue: String(evaluated.currentValue),
            progressPercent: String(evaluated.progressPercent.toFixed(2)),
            status: progressStatus,
            notes: recurring && evaluated.achieved
              ? `${evaluated.guidanceText} Target met for this ${config.frequency.toLowerCase()} interval.`
              : evaluated.guidanceText,
            measuredAt: now,
          },
        });
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
    if (config.frequency === 'DAILY') { const start = new Date(now); start.setHours(0, 0, 0, 0); return { start, end: now }; }
    if (config.frequency === 'WEEKLY') { const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0); return { start, end: now }; }
    return { start: goalCreatedAt, end: now };
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
    if (config.comparison === 'CLOSEST') {      const targetWeight = baseline;
      const toleranceKg = 0.5;
      const deviation = Math.abs(latest - targetWeight);
      const progressPercent = Math.max(0, Math.min(100, 100 - (deviation / toleranceKg) * 100));
      const guidanceText = deviation <= toleranceKg
        ? `${title}: weight is within ${toleranceKg.toFixed(1)} kg of the maintenance target. Keep tracking your current weight.`
        : `${title}: weight is ${deviation.toFixed(1)} kg from the maintenance target of ${targetWeight.toFixed(1)} kg. Keep tracking changes from your baseline.`;
      // Maintenance is an ongoing state, not a one-time achievement.
      return { strategy: 'DELTA_REDUCTION', currentValue: latest, progressPercent, achieved: false, guidanceText };
    }
    // Weight goal targets are absolute destination weights. For example, INCREASE_TO + target=100
    // means "reach 100 kg", not "gain 100 kg from baseline".
    const targetWeight = target;
    const totalPlannedChange = Math.abs(targetWeight - baseline);
    const movement = config.comparison === 'INCREASE_TO'
      ? Math.max(latest - baseline, 0)
      : Math.max(baseline - latest, 0);
    const progressPercent = totalPlannedChange === 0
      ? Math.abs(latest - targetWeight) <= 0.5 ? 100 : 0
      : Math.max(0, Math.min(100, (movement / totalPlannedChange) * 100));
    const achieved = config.comparison === 'INCREASE_TO' ? latest >= targetWeight : latest <= targetWeight;
    const guidanceText = achieved
      ? `${title}: target met at ${targetWeight.toFixed(1)} kg.`
      : `${title}: keep tracking weight toward ${targetWeight.toFixed(1)} kg.`;
    return { strategy: 'DELTA_REDUCTION', currentValue: latest, progressPercent: achieved ? 100 : progressPercent, achieved, guidanceText };
  }

  private async evaluateStrategy(patientId: string, title: string, config: GoalConfig, goalCreatedAt: Date, start: Date, now: Date, aggregate: number, target: number, strategy: TrackingStrategy): Promise<StrategyEvaluation> {
    if (strategy === 'DELTA_REDUCTION') return this.evaluateWeightStrategy(patientId, title, config, goalCreatedAt, now, target);
    const history = await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal; occurredAt: Date }>>`SELECT "loggedValue", "occurredAt" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = ${config.metricType} AND "metricKey" = ${config.metricKey} AND "occurredAt" >= ${goalCreatedAt} AND "occurredAt" <= ${now} ORDER BY "occurredAt" ASC`;
    const values = history.map((row) => Number(row.loggedValue)).filter(Number.isFinite);
    const latest = values.length ? values[values.length - 1] : aggregate;
    let progressPercent = 0; let achieved = false; let currentValue = latest;
    if (strategy === 'STEP_DOWN_TAPER') { const baseline = values.length ? values[0] : aggregate; const reduction = baseline - latest; progressPercent = baseline === 0 ? 100 : Math.max(0, Math.min(100, (reduction / Math.abs(baseline)) * 100)); achieved = config.comparison === 'AT_MOST' ? aggregate <= target : latest <= target; }
    else if (strategy === 'CADENCE_ACCUMULATION') { currentValue = aggregate; progressPercent = target <= 0 ? 100 : Math.max(0, Math.min(100, (aggregate / target) * 100)); achieved = config.comparison === 'AT_LEAST' ? aggregate >= target : aggregate <= target; }
    else if (strategy === 'ADHERENCE_SCORE') { currentValue = aggregate; progressPercent = Math.max(0, Math.min(100, aggregate)); achieved = aggregate >= target; }
    else if (strategy === 'TARGET_RANGE_STABILIZATION') { currentValue = latest; progressPercent = target <= 0 ? 100 : Math.max(0, Math.min(100, 100 - (Math.abs(latest - target) / Math.max(Math.abs(target), 1)) * 100)); achieved = config.comparison === 'AT_MOST' ? latest <= target : config.comparison === 'AT_LEAST' ? latest >= target : Math.abs(latest - target) < 0.5; }
    else { currentValue = latest; progressPercent = target === 0 ? 100 : Math.max(0, Math.min(100, (latest / target) * 100)); achieved = config.comparison === 'AT_MOST' ? latest <= target : latest >= target; }
    const guidanceText = achieved ? `${title}: target met based on ${config.metricKey}.` : `${title}: keep tracking ${config.metricKey} toward the target.`;
    return { strategy, currentValue, progressPercent, achieved, guidanceText };
  }
}