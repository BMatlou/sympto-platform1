import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from './goals-engine-v3.service';

export type HealthActivitySnapshot = {
  patientId: string;
  journalId?: string;
  exerciseMinutes?: number | null;
  waterIntakeMl?: number | null;
  sleepHours?: number | null;
  weightKg?: number | null;
  stressLevel?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
};

type RelationRow = {
  id: string;
  sourceGoalId: string;
  targetGoalId: string;
  relationshipType: string;
  rationale: string | null;
  relatedGoalId: string;
  relatedTitle: string;
  relatedCategory: string;
  relatedStatus: string;
  relatedTargetValue: number | null;
  relatedUnit: string | null;
  relatedTargetDate: Date | null;
};

type RelationPairRow = {
  id: string;
  sourceGoalId: string;
  targetGoalId: string;
  relationshipType: string;
  rationale: string | null;
  sourceTitle: string;
  sourceCategory: string;
  sourceStatus: string;
  sourceTargetValue: number | null;
  sourceUnit: string | null;
  sourceTargetDate: Date | null;
  targetTitle: string;
  targetCategory: string;
  targetStatus: string;
  targetTargetValue: number | null;
  targetUnit: string | null;
  targetTargetDate: Date | null;
};

type WeightEvent = { value: number; at: Date };

type WeightPlan = {
  direction: 'LOSE' | 'GAIN' | 'MAINTAIN';
  targetWeightKg: number | null;
  requestedChangeKg: number | null;
  remainingChangeKg: number | null;
  daysRemaining: number | null;
  requiredDailyChangeKg: number | null;
  requiredWeeklyChangeKg: number | null;
  status: 'PLANNING' | 'ON_TARGET' | 'TARGET_REACHED' | 'DATE_REACHED' | 'NO_TARGET_DATE';
};

type WeightHealthContext = {
  connectedGoals: Array<{ title: string; category: string; relationshipType: string; direction: string }>;
  activeConditions: Array<{ name: string; chronic: boolean; severity: string | null; stage: string | null }>;
  activeMedications: Array<{ name: string; dosage: string | null; frequency: string | null; indication: string | null; sideEffectsRecorded: boolean }>;
};

const WEIGHT_SUPPORT_RULES = [
  { category: 'EXERCISE', rationale: 'Regular physical activity is a supporting behaviour for weight management and overall health.' },
  { category: 'NUTRITION', rationale: 'Nutrition tracking provides context for energy intake and helps make the weight plan actionable.' },
  { category: 'SLEEP', rationale: 'Sleep is part of a broader weight-management and wellbeing pattern and is useful to monitor alongside weight.' },
] as const;

const WEIGHT_RELATED_RULES = new Set(['SMOKING', 'ALCOHOL', 'BLOOD_PRESSURE', 'BLOOD_GLUCOSE', 'CHOLESTEROL']);

function ageFromDateOfBirth(value: Date | null | undefined): number | null {
  if (!value) return null;
  const now = new Date();
  let age = now.getFullYear() - value.getFullYear();
  if (now.getMonth() < value.getMonth() || (now.getMonth() === value.getMonth() && now.getDate() < value.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function southAfricaDayBounds(value = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
  const start = new Date(`${date}T00:00:00+02:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function linearTrendKgPerWeek(events: WeightEvent[]): number | null {
  if (events.length < 2) return null;
  const t0 = events[0].at.getTime();
  const xs = events.map((event) => (event.at.getTime() - t0) / 86400000);
  const ys = events.map((event) => event.value);
  const xMean = average(xs) ?? 0;
  const yMean = average(ys) ?? 0;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < xs.length; i += 1) {
    numerator += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }
  return denominator > 0 ? (numerator / denominator) * 7 : 0;
}

@Injectable()
export class HealthGoalIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsEngine: GoalsEngineService,
  ) {}

  async syncDailyGoals(snapshot: HealthActivitySnapshot) {
    return this.syncTodayFromJournal(snapshot.patientId);
  }

  async recomputeMetric(patientId: string, metricType: string, metricKey: string, at = new Date()) {
    return this.goalsEngine.recomputeMatchingGoals(patientId, metricType, metricKey, at);
  }

  async syncTodayFromJournal(patientId: string, _date = new Date()) {
    await this.syncGoalRelations(patientId);
    await this.goalsEngine.backfillJournalMetrics(patientId);
    await this.goalsEngine.backfillPatientProfileMetrics(patientId);
    return this.goalsEngine.recomputeAllMatchingGoals(patientId);
  }

  async syncGoalRelations(patientId: string) {
    const goals = await this.prisma.healthGoal.findMany({
      where: { patientId, status: { in: ['ACTIVE', 'ON_HOLD'] } },
      select: { id: true, category: true },
    });
    const weightGoals = goals.filter((goal) => String(goal.category).toUpperCase() === 'WEIGHT');
    const desired = new Map<string, { sourceGoalId: string; targetGoalId: string; relationshipType: 'SUPPORTS' | 'RELATED_TO'; rationale: string | null }>();

    for (const weightGoal of weightGoals) {
      for (const relatedGoal of goals) {
        if (relatedGoal.id === weightGoal.id) continue;
        const category = String(relatedGoal.category).toUpperCase();

        if (WEIGHT_SUPPORT_RULES.some((rule) => rule.category === category)) {
          const rationale = WEIGHT_SUPPORT_RULES.find((rule) => rule.category === category)?.rationale ?? null;
          const relationshipType = 'SUPPORTS' as const;
          desired.set(`${relatedGoal.id}|${weightGoal.id}|${relationshipType}`, { sourceGoalId: relatedGoal.id, targetGoalId: weightGoal.id, relationshipType, rationale });
        } else if (WEIGHT_RELATED_RULES.has(category)) {
          const relationshipType = 'RELATED_TO' as const;
          const rationale = 'This health behaviour or outcome can be monitored alongside the weight goal without assuming that it caused the weight change.';
          desired.set(`${relatedGoal.id}|${weightGoal.id}|${relationshipType}`, { sourceGoalId: relatedGoal.id, targetGoalId: weightGoal.id, relationshipType, rationale });
        }
      }
    }

    const existing = await this.prisma.$queryRawUnsafe<Array<{ id: string; sourceGoalId: string; targetGoalId: string; relationshipType: string }>>(
      'SELECT r."id",r."sourceGoalId",r."targetGoalId",r."relationshipType" FROM "HealthGoalRelation" r INNER JOIN "HealthGoal" s ON s."id"=r."sourceGoalId" INNER JOIN "HealthGoal" t ON t."id"=r."targetGoalId" WHERE r."patientId"=$1 AND r."createdBy"=\'SYSTEM\' AND (s."category"=\'WEIGHT\' OR t."category"=\'WEIGHT\')',
      patientId,
    );

    for (const relation of existing) {
      const key = `${relation.sourceGoalId}|${relation.targetGoalId}|${relation.relationshipType}`;
      if (!desired.has(key)) {
        await this.prisma.$executeRawUnsafe('DELETE FROM "HealthGoalRelation" WHERE "id"=$1::uuid', relation.id);
      }
    }

    for (const relation of desired.values()) {
      await this.upsertRelation(
        patientId,
        relation.sourceGoalId,
        relation.targetGoalId,
        relation.relationshipType,
        relation.rationale,
      );
    }
  }

  private async upsertRelation(
    patientId: string,
    sourceGoalId: string,
    targetGoalId: string,
    relationshipType: 'SUPPORTS' | 'RELATED_TO' | 'MONITORS',
    rationale: string | null,
  ) {
    await this.prisma.$executeRawUnsafe(
      'INSERT INTO "HealthGoalRelation" ("id","patientId","sourceGoalId","targetGoalId","relationshipType","rationale","createdBy") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6) ON CONFLICT ("sourceGoalId","targetGoalId","relationshipType") DO UPDATE SET "patientId"=EXCLUDED."patientId","rationale"=EXCLUDED."rationale","updatedAt"=CURRENT_TIMESTAMP',
      patientId,
      sourceGoalId,
      targetGoalId,
      relationshipType,
      rationale,
      'SYSTEM',
    );
  }

  async getGoalRelationships(goalId: string) {
    const goal = await this.prisma.healthGoal.findUnique({
      where: { id: goalId },
      select: { id: true, patientId: true, title: true, category: true, status: true, targetValue: true, unit: true, targetDate: true, priority: true },
    });
    if (!goal) throw new NotFoundException('Health goal not found.');

    await this.syncGoalRelations(goal.patientId);
    const rows = await this.prisma.$queryRawUnsafe<RelationRow[]>(      `SELECT r."id",r."sourceGoalId",r."targetGoalId",r."relationshipType",r."rationale",g."id" AS "relatedGoalId",g."title" AS "relatedTitle",g."category"::text AS "relatedCategory",g."status"::text AS "relatedStatus",g."targetValue"::double precision AS "relatedTargetValue",g."unit" AS "relatedUnit",g."targetDate" AS "relatedTargetDate" FROM "HealthGoalRelation" r INNER JOIN "HealthGoal" g ON g."id"=CASE WHEN r."sourceGoalId"=$1 THEN r."targetGoalId" ELSE r."sourceGoalId" END WHERE r."patientId"=$2 AND (r."sourceGoalId"=$1 OR r."targetGoalId"=$1) ORDER BY CASE WHEN r."relationshipType"='SUPPORTS' THEN 0 ELSE 1 END,g."category",g."title"`,      goalId,
      goal.patientId,
    );

    return {
      relationships: rows.map((row) => ({
        id: row.id,
        direction: row.relationshipType === 'SUPPORTS' ? row.targetGoalId === goalId ? 'supportsThisGoal' : 'supportsAnotherGoal' : 'relatedToThisGoal',
        relationshipType: row.relationshipType,
        rationale: row.rationale,
        goal: {
          id: row.relatedGoalId,
          title: row.relatedTitle,
          category: row.relatedCategory,
          status: row.relatedStatus,
          targetValue: row.relatedTargetValue,
          unit: row.relatedUnit,
          targetDate: row.relatedTargetDate,
        },
      })),
    };
  }

  async attachRelationships<T extends { id: string; patientId?: string }>(goals: T[]) {
    if (!goals.length) return goals;
    const patientIds = [...new Set(goals.map((goal) => goal.patientId).filter(Boolean))] as string[];
    for (const patientId of patientIds) await this.syncGoalRelations(patientId);

    const goalIds = goals.map((goal) => goal.id);
    const rows = await this.prisma.$queryRawUnsafe<RelationPairRow[]>(
      'SELECT r."id",r."sourceGoalId",r."targetGoalId",r."relationshipType",r."rationale",s."title" AS "sourceTitle",s."category"::text AS "sourceCategory",s."status"::text AS "sourceStatus",s."targetValue"::double precision AS "sourceTargetValue",s."unit" AS "sourceUnit",s."targetDate" AS "sourceTargetDate",t."title" AS "targetTitle",t."category"::text AS "targetCategory",t."status"::text AS "targetStatus",t."targetValue"::double precision AS "targetTargetValue",t."unit" AS "targetUnit",t."targetDate" AS "targetTargetDate" FROM "HealthGoalRelation" r INNER JOIN "HealthGoal" s ON s."id"=r."sourceGoalId" INNER JOIN "HealthGoal" t ON t."id"=r."targetGoalId" WHERE r."patientId" = ANY($2) AND (r."sourceGoalId" = ANY($1) OR r."targetGoalId" = ANY($1))',
      goalIds,
      patientIds,
    );

    return goals.map((goal) => ({
      ...goal,
      connectedGoals: rows
        .filter((row) => row.sourceGoalId === goal.id || row.targetGoalId === goal.id)
        .map((row) => {
          const targetIsCurrent = row.targetGoalId === goal.id;
          return {
            id: row.id,
            direction: row.relationshipType === 'SUPPORTS'
              ? targetIsCurrent ? 'supportsThisGoal' : 'supportsAnotherGoal'
              : 'relatedToThisGoal',
            relationshipType: row.relationshipType,
            rationale: row.rationale,
            goal: {
              id: targetIsCurrent ? row.sourceGoalId : row.targetGoalId,
              title: targetIsCurrent ? row.sourceTitle : row.targetTitle,
              category: targetIsCurrent ? row.sourceCategory : row.targetCategory,
              status: targetIsCurrent ? row.sourceStatus : row.targetStatus,
              targetValue: targetIsCurrent ? row.sourceTargetValue : row.targetTargetValue,
              unit: targetIsCurrent ? row.sourceUnit : row.targetUnit,
              targetDate: targetIsCurrent ? row.sourceTargetDate : row.targetTargetDate,
            },
          };
        }),
    }));
  }

  async getWeightGoalIntelligence(goalId: string) {
    try {
      const goal = await this.prisma.healthGoal.findUnique({
      where: { id: goalId },
      select: {
        id: true,
        patientId: true,
        title: true,
        category: true,
        targetValue: true,
        unit: true,
        targetDate: true,
        priority: true,
        status: true,
        createdAt: true,
        patient: {
          select: {
            weightKg: true,
            heightCm: true,
            person: { select: { dateOfBirth: true, gender: true } },
          },
        },
      },
    });
    if (!goal) throw new NotFoundException('Health goal not found.');
    if (String(goal.category).toUpperCase() !== 'WEIGHT') throw new NotFoundException('This intelligence view is only available for weight goals.');

    // Metric intelligence is sourced directly from HealthGoalMetricEvent.
    // Do not let the legacy HealthGoalRelation synchronizer break this endpoint.

    const baselineRows = await this.prisma.$queryRawUnsafe<Array<{ loggedValue: number | string | null }>>(
      'SELECT "loggedValue"::double precision AS "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId"=$1 AND "metricType"=\'WEIGHT\' AND "metricKey"=\'weight.kg\' AND "source"=\'goal-baseline\' AND "sourceId"=$2 LIMIT 1',
      goal.patientId,
      goal.id,
    );
    const baselineRaw = baselineRows[0]?.loggedValue;
    const baselineFromEvent = baselineRaw == null ? null : Number(baselineRaw);
    const baselineKg =
      baselineFromEvent != null && Number.isFinite(baselineFromEvent)
        ? baselineFromEvent
        : goal.patient.weightKg == null
          ? null
          : Number(goal.patient.weightKg);

    const events = await this.prisma.$queryRawUnsafe<Array<{ loggedValue: number | string | null; occurredAt: Date | string | null }>>(
      'SELECT "loggedValue"::double precision AS "loggedValue","occurredAt" FROM "HealthGoalMetricEvent" WHERE "patientId"=$1 AND "metricType"=\'WEIGHT\' AND "metricKey"=\'weight.kg\' AND "source" <> \'goal-baseline\' AND "occurredAt"<=CURRENT_TIMESTAMP ORDER BY "occurredAt" ASC',
      goal.patientId,
    );
    const cleanedEvents: WeightEvent[] = events
      .map((row) => ({
        value: row.loggedValue == null ? Number.NaN : Number(row.loggedValue),
        at: row.occurredAt == null ? new Date(Number.NaN) : new Date(row.occurredAt),
      }))
      .filter(
        (row) => Number.isFinite(row.value) && !Number.isNaN(row.at.getTime()),
      );

    const latestKg = cleanedEvents.length ? cleanedEvents[cleanedEvents.length - 1].value : baselineKg;
    const now = Date.now();
    const recent7 = cleanedEvents.filter((row) => now - row.at.getTime() <= 7 * 86400000).map((row) => row.value);
    const recent30 = cleanedEvents.filter((row) => now - row.at.getTime() <= 30 * 86400000).map((row) => row.value);
    const average7dKg = average(recent7);
    const average30dKg = average(recent30);
    const trendKgPerWeek = linearTrendKgPerWeek(cleanedEvents.slice(-30));

    const heightCm = goal.patient.heightCm == null ? null : Number(goal.patient.heightCm);
    const currentBmi = latestKg != null && heightCm && heightCm > 0 ? latestKg / ((heightCm / 100) ** 2) : null;
    const baselineBmi = baselineKg != null && heightCm && heightCm > 0 ? baselineKg / ((heightCm / 100) ** 2) : null;
    const targetAmount = goal.targetValue == null ? null : Number(goal.targetValue);
    const comparisonRows = await this.prisma.$queryRawUnsafe<Array<{ comparison: string | null }>>(
      'SELECT "comparison" FROM "HealthGoalMetricConfig" WHERE "healthGoalId"=$1 LIMIT 1',
      goal.id,
    );
    const comparison = String(comparisonRows[0]?.comparison ?? 'DECREASE_TO').toUpperCase();

    const maintenanceBand = baselineKg == null ? null : { min: baselineKg * 0.98, max: baselineKg * 1.02 };
    const withinMaintenanceBand = comparison === 'CLOSEST' && average7dKg != null && maintenanceBand != null
      ? average7dKg >= maintenanceBand.min && average7dKg <= maintenanceBand.max
      : null;
    const isMaintenanceGoal = comparison === 'CLOSEST';
    const maintenanceStatus =
      !isMaintenanceGoal
        ? null
        : withinMaintenanceBand == null
          ? 'INSUFFICIENT_DATA'
          : withinMaintenanceBand
            ? 'STABLE'
            : 'NEEDS_REVIEW';

    const age = ageFromDateOfBirth(goal.patient.person.dateOfBirth);
    const adultBmiApplicable = age == null || age >= 20;
    // Directional weight goals store the requested amount of change.
    // Example: baseline 68 kg + INCREASE_TO + targetValue 100 = projected weight 168 kg.
    const requestedChangeKg = comparison === 'CLOSEST' || targetAmount == null ? null : Math.max(targetAmount, 0);
    const targetWeight =
      comparison === 'INCREASE_TO' && baselineKg != null && requestedChangeKg != null
        ? baselineKg + requestedChangeKg
        : comparison === 'DECREASE_TO' && baselineKg != null && requestedChangeKg != null
          ? baselineKg - requestedChangeKg
          : comparison === 'CLOSEST'
            ? baselineKg
            : null;
    const targetBmi = targetWeight != null && heightCm && heightCm > 0 ? targetWeight / ((heightCm / 100) ** 2) : null;
    const lowerScreeningWeightKg = heightCm != null && heightCm > 0 ? 18.5 * ((heightCm / 100) ** 2) : null;
    const upperScreeningWeightKg = heightCm != null && heightCm > 0 ? 24.9 * ((heightCm / 100) ** 2) : null;
    const targetBmiStatus: 'BELOW_RANGE' | 'WITHIN_RANGE' | 'OVERWEIGHT' | 'OBESITY_CLASS_1' | 'OBESITY_CLASS_2' | 'OBESITY_CLASS_3' | null =
      !adultBmiApplicable || targetBmi == null
        ? null
        : targetBmi < 18.5
          ? 'BELOW_RANGE'
          : targetBmi < 25
            ? 'WITHIN_RANGE'
            : targetBmi < 30
              ? 'OVERWEIGHT'
              : targetBmi < 35
                ? 'OBESITY_CLASS_1'
                : targetBmi < 40
                  ? 'OBESITY_CLASS_2'
                  : 'OBESITY_CLASS_3';
    const targetNeedsReview = !['CLOSEST'].includes(comparison)
      && targetBmiStatus != null
      && targetBmiStatus !== 'WITHIN_RANGE';

    let status: 'STABLE' | 'DRIFTING_UP' | 'DRIFTING_DOWN' | 'NEEDS_REVIEW' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (comparison === 'CLOSEST') {
      if (average7dKg == null || baselineKg == null) {
        status = 'INSUFFICIENT_DATA';
      } else if (withinMaintenanceBand === true) {
        // A maintenance goal is considered on track while the recent average
        // stays inside the baseline maintenance band. Trend direction can still
        // be shown separately without turning a small, in-band fluctuation into
        // a warning state.
        status = 'STABLE';
      } else {
        status = average7dKg > baselineKg ? 'DRIFTING_UP' : 'DRIFTING_DOWN';
      }
    } else if (latestKg != null && baselineKg != null) {
      const delta = latestKg - baselineKg;
      const directed = comparison === 'DECREASE_TO' ? -delta : delta;
      status = directed > 0.05 ? 'DRIFTING_UP' : directed < -0.05 ? 'DRIFTING_DOWN' : 'STABLE';
    }

    const journals = await this.prisma.healthJournal.findMany({
      where: { patientId: goal.patientId, createdAt: { gte: new Date(now - 30 * 86400000) } },
      select: { sleepHours: true, stressLevel: true, exerciseMinutes: true, waterIntakeMl: true },
      orderBy: { createdAt: 'asc' },
    });
    const values = {
      sleep: journals.map((j) => j.sleepHours == null ? null : Number(j.sleepHours)).filter((v): v is number => v != null && Number.isFinite(v)),
      stress: journals.map((j) => j.stressLevel == null ? null : Number(j.stressLevel)).filter((v): v is number => v != null && Number.isFinite(v)),
      exercise: journals.map((j) => j.exerciseMinutes == null ? null : Number(j.exerciseMinutes)).filter((v): v is number => v != null && Number.isFinite(v)),
      water: journals.map((j) => j.waterIntakeMl == null ? null : Number(j.waterIntakeMl)).filter((v): v is number => v != null && Number.isFinite(v)),
    };

    let relationshipData: { relationships: any[] } = { relationships: [] };
    try {
      relationshipData = await this.getGoalRelationships(goal.id);
    } catch (relationshipError) {
      console.warn(
        '⚠️ Weight intelligence relationship data unavailable:',
        relationshipError instanceof Error
          ? relationshipError.message
          : String(relationshipError),
      );
    }
    const activeMedicationCount = await this.prisma.patientMedication.count({
      where: { healthPassport: { patientId: goal.patientId }, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    const activeConditionCount = await this.prisma.patientCondition.count({
      where: { healthPassport: { patientId: goal.patientId }, status: 'ACTIVE' },    });    const recentSymptomCount = await this.prisma.symptomLog.count({
      where: {        clinicalEpisode: { patientId: goal.patientId },
        status: { in: ['ACTIVE', 'COMPLETED'] },
        startedAt: { gte: new Date(now - 30 * 86400000) },
      },
    });

    const recommendedSupportingGoals = WEIGHT_SUPPORT_RULES
      .map((rule) => ({ category: rule.category, rationale: rule.rationale }))
      .filter((item) => !relationshipData.relationships.some((relation) => String(relation.goal.category).toUpperCase() === item.category && relation.relationshipType === 'SUPPORTS'));

    const { start: todayStart, end: todayEnd } = southAfricaDayBounds();
    const todayJournal = await this.prisma.healthJournal.findFirst({
      where: {
        patientId: goal.patientId,
        createdAt: { gte: todayStart, lt: todayEnd },
        title: 'Daily Health Check-in',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sleepHours: true,
        stressLevel: true,
        exerciseMinutes: true,
        waterIntakeMl: true,
        mood: true,
      },
    });

    const latestWeightAt = cleanedEvents.length
      ? cleanedEvents[cleanedEvents.length - 1].at
      : baselineKg != null
        ? new Date(goal.createdAt)
        : null;
    const weightDataNeedsRefresh = baselineKg == null || (latestWeightAt != null && Date.now() - latestWeightAt.getTime() > 7 * 86400000);
    const checkInNeedsCompletion = !todayJournal;

    const direction: WeightPlan['direction'] =
      comparison === 'INCREASE_TO' ? 'GAIN'
        : comparison === 'DECREASE_TO' ? 'LOSE'
          : 'MAINTAIN';

    const targetDateAt = goal.targetDate ? new Date(goal.targetDate) : null;
    const daysRemaining = targetDateAt && !Number.isNaN(targetDateAt.getTime())
      ? Math.max(0, Math.ceil((targetDateAt.getTime() - Date.now()) / 86400000))
      : null;

    let remainingChangeKg: number | null = null;
    if (latestKg != null && targetWeight != null) {
      remainingChangeKg = direction === 'GAIN'
        ? Math.max(targetWeight - latestKg, 0)
        : direction === 'LOSE'
          ? Math.max(latestKg - targetWeight, 0)
          : 0;
    }

    const targetReachedNow = direction === 'GAIN'
      ? targetWeight != null && latestKg != null && latestKg >= targetWeight
      : direction === 'LOSE'
        ? targetWeight != null && latestKg != null && latestKg <= targetWeight
        : false;

    const weightPlan: WeightPlan = {
      direction,
      targetWeightKg: targetWeight,
      requestedChangeKg,
      remainingChangeKg,
      daysRemaining,
      requiredDailyChangeKg:
        daysRemaining != null && daysRemaining > 0 && remainingChangeKg != null && direction !== 'MAINTAIN'
          ? remainingChangeKg / daysRemaining
          : null,
      requiredWeeklyChangeKg:
        daysRemaining != null && daysRemaining > 0 && remainingChangeKg != null && direction !== 'MAINTAIN'
          ? remainingChangeKg / (daysRemaining / 7)
          : null,
      status:
        direction === 'MAINTAIN'
          ? 'ON_TARGET'
          : targetReachedNow
            ? 'TARGET_REACHED'
            : daysRemaining == null
              ? 'NO_TARGET_DATE'
              : daysRemaining === 0
                ? 'DATE_REACHED'
                : targetWeight != null && latestKg != null
                  ? 'PLANNING'
                  : 'NO_TARGET_DATE',
    };

    const activeConditionRows = await this.prisma.patientCondition.findMany({
      where: { healthPassport: { patientId: goal.patientId }, status: 'ACTIVE' },
      select: {
        chronic: true,
        severity: true,
        stage: true,
        condition: { select: { name: true, chronic: true } },
      },
      orderBy: [{ primaryCondition: 'desc' }, { createdAt: 'asc' }],
      take: 12,
    });

    const activeMedicationRows = await this.prisma.patientMedication.findMany({
      where: { healthPassport: { patientId: goal.patientId }, status: { in: ['ACTIVE', 'PAUSED'] } },
      select: {
        dosage: true,
        frequency: true,
        indication: true,
        sideEffects: true,
        medication: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 12,
    });

    const weightHealthContext: WeightHealthContext = {
      connectedGoals: relationshipData.relationships.map((relation) => ({
        title: String(relation.goal.title),
        category: String(relation.goal.category),
        relationshipType: String(relation.relationshipType),
        direction: String(relation.direction),
      })),
      activeConditions: activeConditionRows.map((row) => ({
        name: String(row.condition.name),
        chronic: Boolean(row.chronic || row.condition.chronic),
        severity: row.severity ? String(row.severity) : null,
        stage: row.stage ? String(row.stage) : null,
      })),
      activeMedications: activeMedicationRows.map((row) => ({
        name: String(row.medication.name),
        dosage: row.dosage ? String(row.dosage) : null,
        frequency: row.frequency ? String(row.frequency) : null,
        indication: row.indication ? String(row.indication) : null,
        sideEffectsRecorded: Boolean(row.sideEffects?.trim()),
      })),
    };
    const exerciseSupport = relationshipData.relationships.find((relation) =>
      relation.relationshipType === 'SUPPORTS' && String(relation.goal.category).toUpperCase() === 'EXERCISE',
    );
    const sleepSupport = relationshipData.relationships.find((relation) =>
      relation.relationshipType === 'SUPPORTS' && String(relation.goal.category).toUpperCase() === 'SLEEP',
    );
    const nutritionSupport = relationshipData.relationships.find((relation) =>
      relation.relationshipType === 'SUPPORTS' && String(relation.goal.category).toUpperCase() === 'NUTRITION',
    );

    type TodayFocusAction = {
      id: string;
      label: string;
      description: string;
      href: string;
      priority: 'PRIMARY' | 'SUPPORTING';
    };

    const lowerScreeningWeight = lowerScreeningWeightKg;
    const upperScreeningWeight = upperScreeningWeightKg;
    const bmiCaution = comparison === 'DECREASE_TO' && targetBmi != null && targetBmi < 18.5;
    const gainTargetCaution = comparison === 'INCREASE_TO' && targetBmi != null && targetBmi >= 25;
    const currentBmiBelowRange = currentBmi != null && currentBmi < 18.5;

    const todayActions: TodayFocusAction[] = [];

    if (bmiCaution || gainTargetCaution || (currentBmiBelowRange && comparison === 'DECREASE_TO')) {
      todayActions.push({
        id: 'review-weight-goal',
        label: 'Review your weight goal',
        description: gainTargetCaution && targetBmi != null
          ? `Your planned gain target corresponds to BMI ${targetBmi.toFixed(1)}, outside the adult healthy-weight screening range. Review the target before pursuing it.`
          : 'Your current weight/BMI needs the goal reviewed before pursuing further loss.',
        href: `/health-goals?edit=${encodeURIComponent(goal.id)}`,
        priority: 'PRIMARY',
      });
    } else if (weightDataNeedsRefresh) {
      todayActions.push({
        id: 'record-weight',
        label: 'Update your recent weight',
        description: 'Add a recent measurement so Sympto can compare your trend with this goal.',
        href: '/health-vitals',
        priority: 'PRIMARY',
      });
    } else if (checkInNeedsCompletion) {
      todayActions.push({
        id: 'complete-check-in',
        label: 'Complete today’s health check-in',
        description: 'Sleep, stress, hydration, mood and movement give your weight goal useful context.',
        href: '#daily-health-check-in',
        priority: 'PRIMARY',
      });
    } else if (isMaintenanceGoal && maintenanceStatus === 'NEEDS_REVIEW') {
      todayActions.push({
        id: 'review-maintenance-trend',
        label: 'Review your weight trend',
        description: 'Your recent average has moved outside the maintenance band.',
        href: '#today-goals',
        priority: 'PRIMARY',
      });
    } else {
      todayActions.push({
        id: isMaintenanceGoal ? 'maintain-routine' : comparison === 'INCREASE_TO' ? 'support-weight-gain' : 'support-weight-loss',
        label: isMaintenanceGoal
          ? 'Keep today’s routine'
          : comparison === 'INCREASE_TO'
            ? targetWeight != null ? `Keep moving toward ${targetWeight.toFixed(1)} kg` : 'Keep your gain plan moving'
            : targetWeight != null ? `Keep moving toward ${targetWeight.toFixed(1)} kg` : 'Keep your loss plan moving',
        description: isMaintenanceGoal
          ? 'Your recent weight pattern is stable; use today’s check-in to keep the picture current.'
          : weightPlan.requiredWeeklyChangeKg != null
            ? 'You need to ' + (direction === 'GAIN' ? 'gain' : 'lose') + ' about ' + weightPlan.requiredDailyChangeKg!.toFixed(2) + ' kg/day (' + weightPlan.requiredWeeklyChangeKg!.toFixed(2) + ' kg/week) from your current weight to reach the planned target by the target date.'
            : comparison === 'INCREASE_TO'
              ? 'Use the supporting habits already connected to this gain goal rather than adding another task list.'
              : 'Use the supporting habits already connected to this loss goal rather than adding another task list.',
        href: '#daily-health-check-in',
        priority: 'PRIMARY',
      });
    }

    if (exerciseSupport && (!todayJournal || Number(todayJournal.exerciseMinutes ?? 0) <= 0)) {
      todayActions.push({
        id: 'movement',
        label: 'Log movement',
        description: `Your connected exercise goal is “${String(exerciseSupport.goal.title)}”.`,
        href: '#daily-health-check-in',
        priority: 'SUPPORTING',
      });
    }

    if (sleepSupport && (!todayJournal || todayJournal.sleepHours == null)) {
      todayActions.push({
        id: 'sleep',
        label: 'Log your sleep',
        description: `Your connected sleep goal is “${String(sleepSupport.goal.title)}”.`,
        href: '#daily-health-check-in',
        priority: 'SUPPORTING',
      });
    }

    if (nutritionSupport) {
      todayActions.push({
        id: 'nutrition-goal',
        label: 'Check your nutrition goal',
        description: 'Use the goal you already have connected to this weight journey.',
        href: `/health-goals#goal-${encodeURIComponent(String(nutritionSupport.goal.id))}`,
        priority: 'SUPPORTING',
      });
    }

    return {
      goal: {
        id: goal.id,
        title: goal.title,
        comparison,
        targetValue: targetAmount,
        unit: goal.unit,
        targetDate: goal.targetDate,
        priority: goal.priority,
        status: goal.status,
        createdAt: goal.createdAt,
      },
      profile: {
        age,
        gender: goal.patient.person.gender,
        heightCm,
        currentWeightKg: latestKg,
        currentBmi,
        baselineWeightKg: baselineKg,
        baselineBmi,
        adultBmiApplicable,
      },
      weightPlan,
      healthContext: weightHealthContext,
      weight: {
        latestKg,
        average7dKg,
        average30dKg,
        changeKg: baselineKg != null && latestKg != null ? latestKg - baselineKg : null,
        percentChange: baselineKg != null && latestKg != null ? ((latestKg - baselineKg) / baselineKg) * 100 : null,
        trendKgPerWeek,
        dataPoints: cleanedEvents.length,
        maintenanceBand,
        withinMaintenanceBand,
        targetWeightKg: targetWeight,
        requestedChangeKg,
        targetBmi,
        targetBmiStatus,
        targetNeedsReview,
        lowerScreeningWeightKg,
        upperScreeningWeightKg,
        status,
      },
      checkIn: {
        dataPoints: journals.length,
        averageSleepHours: average(values.sleep),        averageStress: average(values.stress),
        averageExerciseMinutes: average(values.exercise),
        averageWaterIntakeMl: average(values.water),
      },      clinicalContext: {
        activeMedicationCount,
        activeConditionCount,
        recentSymptomCount,        symptomsDataAvailable: recentSymptomCount > 0,
      },
      relationships: relationshipData.relationships,
      recommendedSupportingGoals,
      todayFocus: {
        actions: todayActions.slice(0, 3),
        dataFreshness: {
          weightDataNeedsRefresh,
          checkInNeedsCompletion,
          latestWeightAt,
        },
      },
    };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ WEIGHT INTELLIGENCE SYSTEM CRASH REPAIRED:', message);
      return {
        success: false,
        statusCode: 500,
        intelligence: {
          currentTrend: 'UNKNOWN',
          bmiNow: 0,
          guidanceText:
            'Weight metrics undergoing background system synchronization.',
        },
      };
    }
  }
}