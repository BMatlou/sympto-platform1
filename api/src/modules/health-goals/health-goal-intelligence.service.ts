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

const GOAL_SUPPORT_RULES: Record<string, Array<{ sourceCategory: string; rationale: string }>> = {
  WEIGHT: [
    { sourceCategory: 'EXERCISE', rationale: 'Exercise provides a supporting behaviour signal alongside the weight goal.' },
    { sourceCategory: 'NUTRITION', rationale: 'Nutrition tracking provides context that can make the weight plan actionable.' },
    { sourceCategory: 'SLEEP', rationale: 'Sleep provides additional context alongside the weight journey.' },
  ],
  BLOOD_PRESSURE: [
    { sourceCategory: 'EXERCISE', rationale: 'Exercise is a relevant behaviour signal to monitor alongside this cardiovascular goal.' },
    { sourceCategory: 'NUTRITION', rationale: 'Nutrition tracking provides contextual information alongside this cardiovascular goal.' },
  ],
  BLOOD_GLUCOSE: [
    { sourceCategory: 'EXERCISE', rationale: 'Exercise provides a useful activity signal alongside glucose tracking.' },
    { sourceCategory: 'NUTRITION', rationale: 'Nutrition tracking provides contextual information alongside glucose monitoring.' },
  ],
  CHOLESTEROL: [
    { sourceCategory: 'EXERCISE', rationale: 'Exercise provides a useful activity signal alongside cholesterol tracking.' },
    { sourceCategory: 'NUTRITION', rationale: 'Nutrition tracking provides contextual information alongside cholesterol monitoring.' },
  ],
  MENTAL_HEALTH: [
    { sourceCategory: 'SLEEP', rationale: 'Sleep provides useful context alongside a mental-health tracking goal.' },
  ],
  HEART_RATE: [
    { sourceCategory: 'EXERCISE', rationale: 'Exercise provides an activity signal that can be viewed alongside heart-rate measurements.' },
  ],
};

const GOAL_RELATED_PAIRS = new Set([
  'SMOKING|BLOOD_PRESSURE',
  'SMOKING|HEART_RATE',
  'ALCOHOL|WEIGHT',
  'ALCOHOL|BLOOD_PRESSURE',
  'ALCOHOL|BLOOD_GLUCOSE',
  'ALCOHOL|CHOLESTEROL',
  'BLOOD_PRESSURE|HEART_RATE',
  'SLEEP|EXERCISE',
  'HYDRATION|EXERCISE',
]);

const relationshipKey = (left: string, right: string) =>
  left < right ? left + '|' + right : right + '|' + left;

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
    const desired = new Map<string, { sourceGoalId: string; targetGoalId: string; relationshipType: 'SUPPORTS' | 'RELATED_TO'; rationale: string | null }>();

    for (const targetGoal of goals) {
      const targetCategory = String(targetGoal.category).toUpperCase();
      for (const sourceGoal of goals) {
        if (sourceGoal.id === targetGoal.id) continue;
        const sourceCategory = String(sourceGoal.category).toUpperCase();

        const supportRule = (GOAL_SUPPORT_RULES[targetCategory] ?? []).find(
          (rule) => rule.sourceCategory === sourceCategory,
        );
        if (supportRule) {
          const relationshipType = 'SUPPORTS' as const;
          desired.set(sourceGoal.id + '|' + targetGoal.id + '|' + relationshipType, {
            sourceGoalId: sourceGoal.id,
            targetGoalId: targetGoal.id,
            relationshipType,
            rationale: supportRule.rationale,
          });
          continue;
        }

        if (GOAL_RELATED_PAIRS.has(relationshipKey(sourceCategory, targetCategory))) {
          const relationshipType = 'RELATED_TO' as const;
          desired.set(sourceGoal.id + '|' + targetGoal.id + '|' + relationshipType, {
            sourceGoalId: sourceGoal.id,
            targetGoalId: targetGoal.id,
            relationshipType,
            rationale: 'This goal provides related context that can be monitored alongside the other goal without assuming causation.',
          });
        }
      }
    }
    const existing = await this.prisma.$queryRawUnsafe<Array<{ id: string; sourceGoalId: string; targetGoalId: string; relationshipType: string }>>(
      'SELECT r."id",r."sourceGoalId",r."targetGoalId",r."relationshipType" FROM "HealthGoalRelation" r INNER JOIN "HealthGoal" s ON s."id"=r."sourceGoalId" INNER JOIN "HealthGoal" t ON t."id"=r."targetGoalId" WHERE r."patientId"=$1 AND r."createdBy"=\'SYSTEM\'',
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
              baseline: {
                select: {
                  weightKg: true,
                  heightCm: true,
                  bmi: true,
                },
              },
              person: {
                select: {
                  dateOfBirth: true,
                  gender: true,
                },
              },
            },
          },
        },
      });

      if (!goal) throw new NotFoundException('Health goal not found.');
      if (String(goal.category).toUpperCase() !== 'WEIGHT') {
        throw new NotFoundException('This intelligence view is only available for weight goals.');
      }

      const patientId = goal.patientId;
      const now = new Date();

      // The intelligence endpoint must remain independent of the legacy
      // HealthGoalRelation table. Relationships are derived from current
      // Prisma data below, so a legacy relation migration can never take
      // down the weight intelligence response.
      const [
        medicationRows,
        conditionRows,
        medicalRecord,
        relatedGoals,
      ] = await Promise.all([
        this.prisma.patientMedication.findMany({
          where: {
            healthPassport: { patientId },
            status: { in: ['ACTIVE', 'PAUSED'] },
          },
          select: {
            id: true,
            dosage: true,
            frequency: true,
            indication: true,
            sideEffects: true,
            adherencePercentage: true,
            missedDoses: true,
            ongoing: true,
            medication: {
              select: {
                id: true,
                name: true,
                genericName: true,
                category: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 25,
        }),
        this.prisma.patientCondition.findMany({
          where: {
            healthPassport: { patientId },
            status: 'ACTIVE',
          },
          select: {
            chronic: true,
            severity: true,
            stage: true,
            condition: {
              select: {
                name: true,
                chronic: true,
              },
            },
          },
          orderBy: [{ primaryCondition: 'desc' }, { createdAt: 'asc' }],
          take: 25,
        }),
        this.prisma.medicalRecord.findUnique({
          where: { patientId },
          select: {
            chronicConditions: true,
            currentMedications: true,
            pastMedicalHistory: true,
            familyHistory: true,
            socialHistory: true,
          },
        }),
        this.prisma.healthGoal.findMany({
          where: {
            patientId,
            status: { in: ['ACTIVE', 'ON_HOLD'] },
            id: { not: goal.id },
          },
          select: {
            id: true,
            title: true,
            category: true,
            targetValue: true,
            unit: true,
            targetDate: true,
            priority: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ]);

      const baselineRows = await this.prisma.$queryRawUnsafe<Array<{ loggedValue: number | string | null }>>(
        'SELECT "loggedValue"::double precision AS "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId"=$1 AND "metricType"=\'WEIGHT\' AND "metricKey"=\'weight.kg\' AND "source"=\'goal-baseline\' AND "sourceId"=$2 LIMIT 1',
        patientId,
        goal.id,
      );

      const baselineRaw = baselineRows[0]?.loggedValue;
      const baselineEvent = baselineRaw == null ? null : Number(baselineRaw);
      const baselineKg =
        baselineEvent != null && Number.isFinite(baselineEvent)
          ? baselineEvent
          : goal.patient.weightKg == null
            ? null
            : Number(goal.patient.weightKg);

      const weightRows = await this.prisma.$queryRawUnsafe<Array<{
        loggedValue: number | string | null;
        occurredAt: Date | string | null;
      }>>(
        'SELECT "loggedValue"::double precision AS "loggedValue","occurredAt" FROM "HealthGoalMetricEvent" WHERE "patientId"=$1 AND "metricType"=\'WEIGHT\' AND "metricKey"=\'weight.kg\' AND "source" <> \'goal-baseline\' AND "occurredAt"<=CURRENT_TIMESTAMP ORDER BY "occurredAt" ASC',
        patientId,
      );

      const cleanedEvents: WeightEvent[] = weightRows
        .map((row) => ({
          value: row.loggedValue == null ? Number.NaN : Number(row.loggedValue),
          at: row.occurredAt == null ? new Date(Number.NaN) : new Date(row.occurredAt),
        }))
        .filter((row) => Number.isFinite(row.value) && Number.isFinite(row.at.getTime()));

      const latestKg = cleanedEvents.length
        ? cleanedEvents[cleanedEvents.length - 1].value
        : baselineKg;

      const recent7 = cleanedEvents
        .filter((row) => now.getTime() - row.at.getTime() <= 7 * 86400000)
        .map((row) => row.value);
      const recent30 = cleanedEvents
        .filter((row) => now.getTime() - row.at.getTime() <= 30 * 86400000)
        .map((row) => row.value);

      const average7dKg = average(recent7);
      const average30dKg = average(recent30);
      const trendKgPerWeek = linearTrendKgPerWeek(cleanedEvents.slice(-30));

      const heightCm =
        goal.patient.heightCm != null
          ? Number(goal.patient.heightCm)
          : goal.patient.baseline?.heightCm != null
            ? Number(goal.patient.baseline.heightCm)
            : null;
      const age = ageFromDateOfBirth(goal.patient.person.dateOfBirth);
      const gender = goal.patient.person.gender ?? null;
      const currentBmi =
        latestKg != null && heightCm != null && heightCm > 0
          ? latestKg / ((heightCm / 100) ** 2)
          : null;
      const baselineBmi =
        baselineKg != null && heightCm != null && heightCm > 0
          ? baselineKg / ((heightCm / 100) ** 2)
          : goal.patient.baseline?.bmi != null
            ? Number(goal.patient.baseline.bmi)
            : null;

      const configRows = await this.prisma.$queryRawUnsafe<Array<{ comparison: string | null; frequencyTarget: number | string | null }>>(
        'SELECT "comparison","frequencyTarget"::double precision AS "frequencyTarget" FROM "HealthGoalMetricConfig" WHERE "healthGoalId"=$1 LIMIT 1',
        goal.id,
      );
      const comparison = String(configRows[0]?.comparison ?? 'CLOSEST').toUpperCase();
      const targetAmount = goal.targetValue == null ? null : Number(goal.targetValue);
      const requestedChangeKg =
        comparison === 'CLOSEST' || targetAmount == null || !Number.isFinite(targetAmount)
          ? null
          : Math.max(targetAmount, 0);

      const direction: WeightPlan['direction'] =
        comparison === 'INCREASE_TO'
          ? 'GAIN'
          : comparison === 'DECREASE_TO'
            ? 'LOSE'
            : 'MAINTAIN';

      const targetWeightKg =
        direction === 'GAIN' && baselineKg != null && requestedChangeKg != null
          ? baselineKg + requestedChangeKg
          : direction === 'LOSE' && baselineKg != null && requestedChangeKg != null
            ? baselineKg - requestedChangeKg
            : direction === 'MAINTAIN'
              ? baselineKg
              : null;

      // Maintenance deliberately has no reduction/gain pacing. Its target is
      // the baseline and its stability boundary is fixed at ±1.5 kg.
      const maintenanceBand =
        baselineKg == null
          ? null
          : { min: baselineKg - 1.5, max: baselineKg + 1.5 };

      const maintenanceAverage = average7dKg ?? latestKg;
      const withinMaintenanceBand =
        direction === 'MAINTAIN' &&
        maintenanceAverage != null &&
        maintenanceBand != null
          ? maintenanceAverage >= maintenanceBand.min && maintenanceAverage <= maintenanceBand.max
          : null;

      const status: 'STABLE' | 'DRIFTING_UP' | 'DRIFTING_DOWN' | 'NEEDS_REVIEW' | 'INSUFFICIENT_DATA' =
        direction === 'MAINTAIN'
          ? maintenanceAverage == null || baselineKg == null
            ? 'INSUFFICIENT_DATA'
            : withinMaintenanceBand
              ? 'STABLE'
              : maintenanceAverage > baselineKg
                ? 'DRIFTING_UP'
                : 'DRIFTING_DOWN'
          : latestKg == null || baselineKg == null
            ? 'INSUFFICIENT_DATA'
            : direction === 'LOSE'
              ? latestKg < baselineKg ? 'DRIFTING_DOWN' : latestKg > baselineKg ? 'DRIFTING_UP' : 'STABLE'
              : latestKg > baselineKg ? 'DRIFTING_UP' : latestKg < baselineKg ? 'DRIFTING_DOWN' : 'STABLE';

      const targetBmi =
        targetWeightKg != null && heightCm != null && heightCm > 0
          ? targetWeightKg / ((heightCm / 100) ** 2)
          : null;

      const targetBmiStatus =
        age != null && age < 20
          ? null
          : targetBmi == null
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

      const targetNeedsReview =
        direction !== 'MAINTAIN' &&
        targetBmiStatus != null &&
        targetBmiStatus !== 'WITHIN_RANGE';

      const lowerScreeningWeightKg =
        heightCm != null && heightCm > 0
          ? 18.5 * ((heightCm / 100) ** 2)
          : null;
      const upperScreeningWeightKg =
        heightCm != null && heightCm > 0
          ? 24.9 * ((heightCm / 100) ** 2)
          : null;

      const journals = await this.prisma.healthJournal.findMany({
        where: {
          patientId,
          createdAt: { gte: new Date(now.getTime() - 30 * 86400000) },
        },
        select: {
          sleepHours: true,
          stressLevel: true,
          exerciseMinutes: true,
          waterIntakeMl: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const numericValues = {
        sleep: journals.map((j) => Number(j.sleepHours)).filter((v) => Number.isFinite(v)),
        stress: journals.map((j) => Number(j.stressLevel)).filter((v) => Number.isFinite(v)),
        exercise: journals.map((j) => Number(j.exerciseMinutes)).filter((v) => Number.isFinite(v)),
        water: journals.map((j) => Number(j.waterIntakeMl)).filter((v) => Number.isFinite(v)),
      };

      const activeMedications = medicationRows.map((row) => ({
        id: row.id,
        name: String(row.medication.name),
        genericName: row.medication.genericName ? String(row.medication.genericName) : null,
        category: row.medication.category ? String(row.medication.category) : null,
        dosage: row.dosage ? String(row.dosage) : null,
        frequency: row.frequency ? String(row.frequency) : null,
        indication: row.indication ? String(row.indication) : null,
        adherencePercentage:
          row.adherencePercentage == null ? null : Number(row.adherencePercentage),
        missedDoses: row.missedDoses == null ? null : Number(row.missedDoses),
        ongoing: Boolean(row.ongoing),
        sideEffectsRecorded: Boolean(row.sideEffects?.trim()),
      }));

      const activeConditions = conditionRows.map((row) => ({
        name: String(row.condition.name),
        chronic: Boolean(row.chronic || row.condition.chronic),
        severity: row.severity ? String(row.severity) : null,
        stage: row.stage ? String(row.stage) : null,
      }));

      const existingCategories = new Set(
        relatedGoals.map((relatedGoal) => String(relatedGoal.category).toUpperCase()),
      );

      type SupportiveGoalRecommendation = {
        id: string;
        category: string;
        title: string;
        target?: number;
        unit?: string;
        rationale: string;
        source: 'WEIGHT_CONTEXT';
        existingGoalId?: string;
      };

      const recommendedSupportingGoals: SupportiveGoalRecommendation[] = [];

      const addRecommendation = (recommendation: SupportiveGoalRecommendation) => {
        if (
          recommendedSupportingGoals.some(
            (item) => item.id === recommendation.id,
          )
        ) {
          return;
        }
        recommendedSupportingGoals.push(recommendation);
      };

      // Recommendations are deliberately separate from existing relationships.
      // Sympto must never silently create a new health goal just because the
      // weight goal would benefit from one.
      const genericSupportingRules: Array<{
        category: 'EXERCISE' | 'NUTRITION' | 'SLEEP';
        title: string;
        target: number;
        unit: string;
        rationale: string;
      }> = [
        {
          category: 'EXERCISE',
          title: 'Support your weight goal with movement',
          target: 150,
          unit: 'minutes/week',
          rationale: 'Movement provides useful context for weight trends and overall health.',
        },
        {
          category: 'NUTRITION',
          title: 'Track nutrition consistently',
          target: 1,
          unit: 'daily check-in',
          rationale: 'Nutrition tracking adds context to weight patterns without assuming a specific diet.',
        },
        {
          category: 'SLEEP',
          title: 'Monitor sleep consistently',
          target: 7,
          unit: 'hours/night',
          rationale: 'Sleep is useful context alongside weight and broader wellbeing.',
        },
      ];

      for (const rule of genericSupportingRules) {
        if (!existingCategories.has(rule.category)) {
          addRecommendation({
            id: `weight-${rule.category.toLowerCase()}-support`,
            category: rule.category,
            title: rule.title,
            target: rule.target,
            unit: rule.unit,
            rationale: rule.rationale,
            source: 'WEIGHT_CONTEXT',
          });
        }
      }

      const targetCategory = String(goal.category).toUpperCase();
      const existingSupportingGoals = relatedGoals.filter((relatedGoal) =>
        (GOAL_SUPPORT_RULES[targetCategory] ?? []).some(
          (rule) => rule.sourceCategory === String(relatedGoal.category).toUpperCase(),
        ),
      );
      const existingRelatedGoals = relatedGoals.filter((relatedGoal) =>
        GOAL_RELATED_PAIRS.has(
          relationshipKey(String(relatedGoal.category).toUpperCase(), targetCategory),
        ),
      );

      const toGoalConnection = (
        relatedGoal: (typeof relatedGoals)[number],
        relationshipType: 'SUPPORTS' | 'RELATED_TO',
      ) => ({
        id: String(relatedGoal.id),
        direction:
          relationshipType === 'SUPPORTS'
            ? 'supportsThisGoal'
            : 'relatedToThisGoal',
        relationshipType,
        rationale:
          relationshipType === 'SUPPORTS'
            ? (GOAL_SUPPORT_RULES[targetCategory] ?? []).find(
                (rule) =>
                  rule.sourceCategory === String(relatedGoal.category).toUpperCase(),
              )?.rationale ?? null
            : 'This health behaviour or outcome can be monitored alongside the weight goal without assuming that it caused the weight change.',
        goal: {
          id: String(relatedGoal.id),
          title: String(relatedGoal.title),
          category: String(relatedGoal.category),
          status: String(relatedGoal.status),
          targetValue:
            relatedGoal.targetValue == null
              ? null
              : Number(relatedGoal.targetValue),
          unit: relatedGoal.unit,
          targetDate: relatedGoal.targetDate,
        },
      });

      const derivedConnections = [
        ...existingSupportingGoals.map((relatedGoal) =>
          toGoalConnection(relatedGoal, 'SUPPORTS'),
        ),
        ...existingRelatedGoals.map((relatedGoal) =>
          toGoalConnection(relatedGoal, 'RELATED_TO'),
        ),
      ];

      const supportingGoalActions = existingSupportingGoals.map((relatedGoal) => ({
        id: 'supporting-goal-' + String(relatedGoal.id),
        label: String(relatedGoal.title),
        description:
          (GOAL_SUPPORT_RULES[targetCategory] ?? []).find(
            (rule) =>
              rule.sourceCategory === String(relatedGoal.category).toUpperCase(),
          )?.rationale ?? 'Continue tracking this supporting goal alongside your goal.',
        href: '/health-goals#goal-' + encodeURIComponent(String(relatedGoal.id)),
        priority: 'SUPPORTING' as const,
      }));

      const recommendedGoalActions = recommendedSupportingGoals.map((recommendation) => ({
        id: recommendation.id,
        label: recommendation.title,
        description: recommendation.rationale,
        href: '/health-goals',
        priority: 'PRIMARY' as const,
      }));

      const todayFocusActions = [
        ...supportingGoalActions,
        ...recommendedGoalActions,
      ].slice(0, 3);

      const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
      const daysRemaining =
        targetDate != null && Number.isFinite(targetDate.getTime())
          ? Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / 86400000))
          : null;

      const remainingChangeKg =
        direction === 'MAINTAIN' || latestKg == null || targetWeightKg == null
          ? null
          : direction === 'GAIN'
            ? Math.max(targetWeightKg - latestKg, 0)
            : Math.max(latestKg - targetWeightKg, 0);

      const weightPlan: WeightPlan = {
        direction,
        targetWeightKg,
        requestedChangeKg,
        remainingChangeKg,
        daysRemaining,
        requiredDailyChangeKg:
          direction === 'MAINTAIN' || daysRemaining == null || daysRemaining <= 0 || remainingChangeKg == null
            ? null
            : remainingChangeKg / daysRemaining,
        requiredWeeklyChangeKg:
          direction === 'MAINTAIN' || daysRemaining == null || daysRemaining <= 0 || remainingChangeKg == null
            ? null
            : remainingChangeKg / (daysRemaining / 7),
        status:
          direction === 'MAINTAIN'
            ? 'ON_TARGET'
            : remainingChangeKg === 0
              ? 'TARGET_REACHED'
              : daysRemaining == null
                ? 'NO_TARGET_DATE'
                : daysRemaining === 0
                  ? 'DATE_REACHED'
                  : 'PLANNING',
      };

      const { start: todayStart, end: todayEnd } = southAfricaDayBounds();
      const todayJournal = await this.prisma.healthJournal.findFirst({
        where: {
          patientId,
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

      const weightDataNeedsRefresh =
        baselineKg == null ||
        (latestWeightAt != null &&
          now.getTime() - latestWeightAt.getTime() > 7 * 86400000);

      const checkInNeedsCompletion = !todayJournal;

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
          gender,
          heightCm,
          currentWeightKg: latestKg,
          currentBmi,
          baselineWeightKg: baselineKg,
          baselineBmi,
          adultBmiApplicable: age == null || age >= 20,
        },
        weightPlan,
        healthContext: {
          connectedGoals: derivedConnections.map((connection) => ({
            id: connection.goal.id,
            title: connection.goal.title,
            category: connection.goal.category,
            status: connection.goal.status,
            relationshipType: connection.relationshipType,
            direction: connection.direction,
            rationale: connection.rationale,
            targetValue: connection.goal.targetValue,
            unit: connection.goal.unit,
            targetDate: connection.goal.targetDate,
          })),
          activeConditions,
          activeMedications,
          medicalRecord: medicalRecord
            ? {
                chronicConditions: medicalRecord.chronicConditions,
                currentMedications: medicalRecord.currentMedications,
                pastMedicalHistory: medicalRecord.pastMedicalHistory,
                familyHistory: medicalRecord.familyHistory,
                socialHistory: medicalRecord.socialHistory,
              }
            : null,
        },
        weight: {
          latestKg,
          average7dKg,
          average30dKg,
          changeKg: baselineKg != null && latestKg != null ? latestKg - baselineKg : null,
          percentChange:
            baselineKg != null && latestKg != null && baselineKg !== 0
              ? ((latestKg - baselineKg) / baselineKg) * 100
              : null,
          trendKgPerWeek,
          dataPoints: cleanedEvents.length,
          maintenanceBand,
          withinMaintenanceBand,
          targetWeightKg,
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
          averageSleepHours: average(numericValues.sleep),
          averageStress: average(numericValues.stress),
          averageExerciseMinutes: average(numericValues.exercise),
          averageWaterIntakeMl: average(numericValues.water),
        },
        clinicalContext: {
          activeMedicationCount: activeMedications.length,
          activeConditionCount: activeConditions.length,
          recentSymptomCount: 0,
          symptomsDataAvailable: false,
        },
        relationships: derivedConnections,
        recommendedSupportingGoals,
        targetedSupportiveGoals: recommendedSupportingGoals,
        supportiveGoals: recommendedSupportingGoals,
        supportingGoals: existingSupportingGoals.map((relatedGoal) => ({
          id: String(relatedGoal.id),
          title: String(relatedGoal.title),
          category: String(relatedGoal.category),
          status: String(relatedGoal.status),
          targetValue:
            relatedGoal.targetValue == null
              ? null
              : Number(relatedGoal.targetValue),
          unit: relatedGoal.unit,
          targetDate: relatedGoal.targetDate,
        })),
        todayFocus: {
          actions: todayFocusActions,
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
      console.error('❌ WEIGHT INTELLIGENCE PIPELINE RECOVERED:', message);

      return {
        success: false,
        statusCode: 500,
        intelligence: {
          currentTrend: 'UNKNOWN',
          bmiNow: 0,
          guidanceText: 'Weight intelligence is temporarily using safe fallback data.',
          recommendedSupportingGoals: [],
          targetedSupportiveGoals: [],
          supportiveGoals: [],
        },
      };
    }
  }
}
