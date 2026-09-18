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

type WeightEvent = { value: number; at: Date };

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

    const rows = await this.prisma.$queryRawUnsafe<RelationRow[]>(
      'SELECT r."id",r."sourceGoalId",r."targetGoalId",r."relationshipType",r."rationale",g."id" AS "relatedGoalId",g."title" AS "relatedTitle",g."category"::text AS "relatedCategory",g."status"::text AS "relatedStatus",g."targetValue"::double precision AS "relatedTargetValue",g."unit" AS "relatedUnit",g."targetDate" AS "relatedTargetDate" FROM "HealthGoalRelation" r INNER JOIN "HealthGoal" g ON g."id"=CASE WHEN r."sourceGoalId"=$1 THEN r."targetGoalId" ELSE r."sourceGoalId" END WHERE r."patientId"=$2 AND (r."sourceGoalId"=$1 OR r."targetGoalId"=$1) ORDER BY CASE WHEN r."relationshipType"='SUPPORTS' THEN 0 ELSE 1 END,g."category",g."title"',
      goalId,
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
    const rows = await this.prisma.$queryRawUnsafe<RelationRow[]>(
      'SELECT r."id",r."sourceGoalId",r."targetGoalId",r."relationshipType",r."rationale",g."id" AS "relatedGoalId",g."title" AS "relatedTitle",g."category"::text AS "relatedCategory",g."status"::text AS "relatedStatus",g."targetValue"::double precision AS "relatedTargetValue",g."unit" AS "relatedUnit",g."targetDate" AS "relatedTargetDate" FROM "HealthGoalRelation" r INNER JOIN "HealthGoal" g ON g."id"=CASE WHEN r."sourceGoalId" = ANY($1) THEN r."targetGoalId" ELSE r."sourceGoalId" END WHERE r."patientId" = ANY($2) AND (r."sourceGoalId" = ANY($1) OR r."targetGoalId" = ANY($1))',
      goalIds,
      patientIds,
    );

    return goals.map((goal) => ({
      ...goal,
      connectedGoals: rows
        .filter((row) => row.sourceGoalId === goal.id || row.targetGoalId === goal.id)
        .map((row) => ({
          id: row.id,
          direction: row.targetGoalId === goal.id ? 'supportsThisGoal' : 'thisGoalRelatedTo',
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
    }));
  }

  async getWeightGoalIntelligence(goalId: string) {
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

    await this.syncGoalRelations(goal.patientId);

    const baselineRows = await this.prisma.$queryRawUnsafe<Array<{ loggedValue: number }>>(
      'SELECT "loggedValue"::double precision AS "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId"=$1 AND "metricType"=\'WEIGHT\' AND "metricKey"=\'weight.kg\' AND "source"=\'goal-baseline\' AND "sourceId"=$2 LIMIT 1',
      goal.patientId,
      goal.id,
    );
    const baselineKg = baselineRows.length
      ? Number(baselineRows[0].loggedValue)
      : goal.patient.weightKg == null ? null : Number(goal.patient.weightKg);

    const events = await this.prisma.$queryRawUnsafe<Array<{ loggedValue: number; occurredAt: Date }>>(
      'SELECT "loggedValue"::double precision AS "loggedValue","occurredAt" FROM "HealthGoalMetricEvent" WHERE "patientId"=$1 AND "metricType"=\'WEIGHT\' AND "metricKey"=\'weight.kg\' AND "source" <> \'goal-baseline\' AND "occurredAt"<=CURRENT_TIMESTAMP ORDER BY "occurredAt" ASC',
      goal.patientId,
    );
    const cleanedEvents: WeightEvent[] = events
      .map((row) => ({ value: Number(row.loggedValue), at: new Date(row.occurredAt) }))
      .filter((row) => Number.isFinite(row.value) && !Number.isNaN(row.at.getTime()));

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

    const age = ageFromDateOfBirth(goal.patient.person.dateOfBirth);
    const adultBmiApplicable = age == null || age >= 20;
    const targetWeight =
      comparison === 'INCREASE_TO' && baselineKg != null && targetAmount != null
        ? baselineKg + targetAmount
        : comparison === 'DECREASE_TO' && baselineKg != null && targetAmount != null
          ? baselineKg - targetAmount
          : comparison === 'CLOSEST'
            ? baselineKg
            : null;
    const targetBmi = targetWeight != null && heightCm && heightCm > 0 ? targetWeight / ((heightCm / 100) ** 2) : null;

    let status: 'STABLE' | 'DRIFTING_UP' | 'DRIFTING_DOWN' | 'NEEDS_REVIEW' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (comparison === 'CLOSEST') {
      if (average7dKg == null || baselineKg == null) status = 'INSUFFICIENT_DATA';
      else {
        const deviationPct = Math.abs(average7dKg - baselineKg) / baselineKg;
        const drift = trendKgPerWeek ?? 0;
        if (deviationPct > 0.02) status = 'NEEDS_REVIEW';
        else if (deviationPct > 0.01 && drift > 0.15) status = 'DRIFTING_UP';
        else if (deviationPct > 0.01 && drift < -0.15) status = 'DRIFTING_DOWN';
        else status = 'STABLE';
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

    const relationshipData = await this.getGoalRelationships(goal.id);
    const activeMedicationCount = await this.prisma.patientMedication.count({
      where: { healthPassport: { patientId: goal.patientId }, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    const activeConditionCount = await this.prisma.patientCondition.count({
      where: { healthPassport: { patientId: goal.patientId }, status: 'ACTIVE' },
    });
    const recentSymptomCount = await this.prisma.symptomLog.count({
      where: {
        clinicalEpisode: { patientId: goal.patientId },
        status: { in: ['ACTIVE', 'COMPLETED'] },
        startedAt: { gte: new Date(now - 30 * 86400000) },
      },
    });

    const recommendedSupportingGoals = WEIGHT_SUPPORT_RULES
      .map((rule) => ({ category: rule.category, rationale: rule.rationale }))
      .filter((item) => !relationshipData.relationships.some((relation) => String(relation.goal.category).toUpperCase() === item.category && relation.relationshipType === 'SUPPORTS'));

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
        targetBmi,
        status,
      },
      checkIn: {
        dataPoints: journals.length,
        averageSleepHours: average(values.sleep),
        averageStress: average(values.stress),
        averageExerciseMinutes: average(values.exercise),
        averageWaterIntakeMl: average(values.water),
      },
      clinicalContext: {
        activeMedicationCount,
        activeConditionCount,
        recentSymptomCount,
        symptomsDataAvailable: recentSymptomCount > 0,
      },
      relationships: relationshipData.relationships,
      recommendedSupportingGoals,
    };
  }
}
