import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { HealthGoalProgressStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from './goals-engine-v3.service';
import { goalRuleFor } from './goal-metric-rules';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { RecordHealthGoalProgressDto } from './dto/record-health-goal-progress.dto';

const DEFAULT_MEDICATION_TARGET = 90;

type MedicationGoalAssociation = {
  healthGoalId: string;
  patientMedicationId: string | null;
  medicationId: string | null;
  medicationName: string | null;
  dosage: string | null;
  frequency: string | null;
};

@Injectable()
export class HealthGoalsService {
  constructor(private readonly prisma: PrismaService, private readonly goalsEngine: GoalsEngineService) {}

  async findPatientForUser(userId: string) {
    if (!userId) return null;
    return this.prisma.patient.findUnique({ where: { userId }, select: { id: true, userId: true } });
  }

  private async assertPatientMedicationBelongsToPatient(patientMedicationId: string | undefined, patientId: string) {
    if (!patientMedicationId) return;
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT pm."id"
      FROM "PatientMedication" pm
      INNER JOIN "HealthPassport" hp ON hp."id" = pm."healthPassportId"
      WHERE pm."id" = ${patientMedicationId}
        AND hp."patientId" = ${patientId}
      LIMIT 1
    `;
    if (!rows.length) {
      throw new BadRequestException('The selected medication does not belong to this patient.');
    }
  }

  private async medicationGoalAssociations(goalIds: string[]): Promise<MedicationGoalAssociation[]> {
    if (!goalIds.length) return [];
    return this.prisma.$queryRaw<MedicationGoalAssociation[]>`
      SELECT
        hg."id" AS "healthGoalId",
        hg."patientMedicationId",
        pm."medicationId",
        m."name" AS "medicationName",
        pm."dosage",
        pm."frequency"
      FROM "HealthGoal" hg
      LEFT JOIN "PatientMedication" pm ON pm."id" = hg."patientMedicationId"
      LEFT JOIN "Medication" m ON m."id" = pm."medicationId"
      WHERE hg."id" IN (${Prisma.join(goalIds)})
    `;
  }

  private async attachMedicationGoalAssociations<T extends { id: string; category?: unknown; title?: unknown; description?: unknown; patientId?: string }>(goals: T[]) {
    const medicationGoals = goals.filter((goal) => String(goal?.category ?? '').toUpperCase() === 'MEDICATION');
    if (!medicationGoals.length) return goals;

    const associations = await this.medicationGoalAssociations(medicationGoals.map((goal) => goal.id));
    const byGoalId = new Map(associations.map((row) => [String(row.healthGoalId), row]));

    // Legacy medication goals created before patientMedicationId existed can still be
    // resolved safely when their title/description identifies exactly one active medication.
    const patients = [...new Set(medicationGoals.map((goal) => goal.patientId).filter(Boolean))] as string[];
    const legacyMedicationRows = patients.length
      ? await this.prisma.$queryRaw<Array<{ patientId: string; patientMedicationId: string; medicationId: string; medicationName: string; dosage: string | null; frequency: string | null }>>`
          SELECT
            hp."patientId",
            pm."id" AS "patientMedicationId",
            pm."medicationId",
            m."name" AS "medicationName",
            pm."dosage",
            pm."frequency"
          FROM "PatientMedication" pm
          INNER JOIN "HealthPassport" hp ON hp."id" = pm."healthPassportId"
          INNER JOIN "Medication" m ON m."id" = pm."medicationId"
          WHERE hp."patientId" IN (${Prisma.join(patients)})
            AND pm."status" = 'ACTIVE'
        `
      : [];

    const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    return goals.map((goal) => {
      const direct = byGoalId.get(String(goal.id));
      if (direct?.patientMedicationId) {
        return { ...goal, patientMedicationId: direct.patientMedicationId, medicationId: direct.medicationId, medication: { id: direct.medicationId, name: direct.medicationName }, medicationDosage: direct.dosage, medicationFrequency: direct.frequency };
      }

      const title = normalise(goal.title);
      const description = normalise(goal.description);
      const candidates = legacyMedicationRows.filter((row) => {
        if (!goal.patientId || row.patientId !== goal.patientId) return false;
        const name = normalise(row.medicationName);
        return Boolean(name) && (title === name || title.includes(name) || description.includes(name));
      });

      const uniqueMatch = candidates.length === 1 ? candidates[0] : null;
      if (!uniqueMatch) return goal;

      return { ...goal, patientMedicationId: uniqueMatch.patientMedicationId, medicationId: uniqueMatch.medicationId, medication: { id: uniqueMatch.medicationId, name: uniqueMatch.medicationName }, medicationDosage: uniqueMatch.dosage, medicationFrequency: uniqueMatch.frequency };
    });
  }

  async create(dto: CreateHealthGoalDto) {
    const { metricType, metricKey, frequency, frequencyTarget, aggregation, comparison, guidanceText, patientMedicationId, ...goalData } = dto;
    const isMedicationGoal = goalData.category === 'MEDICATION';
    if (patientMedicationId && !isMedicationGoal) {
      throw new BadRequestException('A medication can only be attached to a medication goal.');
    }
    await this.assertPatientMedicationBelongsToPatient(patientMedicationId, goalData.patientId);

    const targetValue = goalData.targetValue ?? (isMedicationGoal ? String(DEFAULT_MEDICATION_TARGET) : undefined);
    const unit = goalData.unit ?? (isMedicationGoal ? '%' : undefined);
    const goal = await this.prisma.healthGoal.create({
      data: { ...goalData, ...(targetValue !== undefined ? { targetValue } : {}), ...(unit !== undefined ? { unit } : {}) },
      include: { patient: true, practitioner: true, carePlan: true, progress: true },
    });

    if (patientMedicationId) {
      await this.prisma.$executeRaw`
        UPDATE "HealthGoal"
        SET "patientMedicationId" = ${patientMedicationId}
        WHERE "id" = ${goal.id}
      `;
    }

    await this.configureMetric(goal.id, {
      metricType,
      metricKey,
      frequency,
      frequencyTarget: frequencyTarget == null ? (isMedicationGoal ? DEFAULT_MEDICATION_TARGET : undefined) : Number(frequencyTarget),
      aggregation,
      comparison,
      guidanceText,
    });
    return this.findOne(goal.id);
  }

  async configureMetric(id: string, config: {
    metricType?: string;
    metricKey?: string;
    frequency?: 'DAILY' | 'WEEKLY' | 'TOTAL';
    frequencyTarget?: number | null;
    guidanceText?: string | null;
    aggregation?: 'SUM' | 'LATEST' | 'AVERAGE' | 'MIN' | 'MAX';
    comparison?: 'AT_LEAST' | 'AT_MOST' | 'CLOSEST' | 'INCREASE_TO' | 'DECREASE_TO';
  }) {
    const goal = await this.findOne(id);
    const defaults = goalRuleFor(goal.category);
    const isMedicationGoal = String(goal.category).toUpperCase() === 'MEDICATION';
    const isSmokingGoal = String(goal.category).toUpperCase() === 'SMOKING';
    const resolvedMetricType = config.metricType ?? defaults.metricType;
    const resolvedMetricKey = config.metricKey ?? defaults.metricKey;
    const resolvedFrequency = config.frequency ?? defaults.frequency;
    const resolvedTarget = config.frequencyTarget ?? Number(goal.targetValue ?? (isMedicationGoal ? DEFAULT_MEDICATION_TARGET : 0));
    const resolvedAggregation = config.aggregation ?? defaults.aggregation;
    const resolvedComparison = config.comparison ?? defaults.comparison;

    if (!(resolvedTarget >= 0) || (!isSmokingGoal && resolvedTarget <= 0)) {
      throw new BadRequestException(isSmokingGoal ? 'A zero-or-positive target is required for a smoking goal.' : 'A positive target is required for an automatic goal.');
    }

    if (isMedicationGoal && (goal.targetValue == null || goal.unit !== '%')) {
      await this.prisma.healthGoal.update({ where: { id }, data: { targetValue: String(resolvedTarget), unit: '%' } });
    }

    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricConfig"
        ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "guidanceText", "aggregation", "comparison")
      VALUES
        (${id}, ${resolvedMetricType}, ${resolvedMetricKey}, ${resolvedFrequency}, ${resolvedTarget}, ${config.guidanceText ?? null}, ${resolvedAggregation}, ${resolvedComparison})
      ON CONFLICT ("healthGoalId") DO UPDATE SET
        "metricType" = EXCLUDED."metricType",
        "metricKey" = EXCLUDED."metricKey",
        "frequency" = EXCLUDED."frequency",
        "frequencyTarget" = EXCLUDED."frequencyTarget",
        "guidanceText" = EXCLUDED."guidanceText",
        "aggregation" = EXCLUDED."aggregation",
        "comparison" = EXCLUDED."comparison",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    await this.goalsEngine.backfillJournalMetrics(goal.patientId);
    await this.goalsEngine.backfillPatientProfileMetrics(goal.patientId);
    await this.goalsEngine.recomputeAllMatchingGoals(goal.patientId);
    return this.findOne(id);
  }

  private async ensureOnboardingWeightGoalMetric(goal: any) {
    if (String(goal?.category).toUpperCase() !== 'WEIGHT') return false;
    const existing = await this.prisma.$queryRaw<Array<{ healthGoalId: string }>>`
      SELECT "healthGoalId" FROM "HealthGoalMetricConfig" WHERE "healthGoalId" = ${goal.id} LIMIT 1
    `;
    if (existing.length) return false;
    const startingWeight = Number(goal?.patient?.weightKg);
    const lossAmount = Number(goal?.targetValue);
    if (!Number.isFinite(startingWeight) || startingWeight <= 0 || !Number.isFinite(lossAmount) || lossAmount <= 0) return false;
    const targetWeight = Number((startingWeight - lossAmount).toFixed(2));
    if (!Number.isFinite(targetWeight) || targetWeight <= 0) return false;
    const rule = goalRuleFor('WEIGHT');
    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricConfig"
        ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "guidanceText", "aggregation", "comparison")
      VALUES
        (${goal.id}, ${rule.metricType}, ${rule.metricKey}, ${rule.frequency}, ${targetWeight}, ${`Lose ${lossAmount}kg from your starting weight of ${startingWeight}kg.`}, ${rule.aggregation}, ${rule.comparison})
      ON CONFLICT ("healthGoalId") DO NOTHING
    `;
    await this.goalsEngine.backfillJournalMetrics(goal.patientId);
    await this.goalsEngine.backfillPatientProfileMetrics(goal.patientId);
    await this.goalsEngine.recomputeAllMatchingGoals(goal.patientId);
    return true;
  }

  private async ensureOnboardingExerciseGoalMetric(goal: any) {
    if (String(goal?.category).toUpperCase() !== 'EXERCISE') return false;
    const existing = await this.prisma.$queryRaw<Array<{ healthGoalId: string }>>`
      SELECT "healthGoalId" FROM "HealthGoalMetricConfig" WHERE "healthGoalId" = ${goal.id} LIMIT 1
    `;
    if (existing.length) return false;
    const targetMinutes = Number(goal?.targetValue);
    if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) return false;
    const rule = goalRuleFor('EXERCISE');
    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricConfig"
        ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "guidanceText", "aggregation", "comparison")
      VALUES
        (${goal.id}, ${rule.metricType}, ${rule.metricKey}, ${rule.frequency}, ${targetMinutes}, ${'Track your weekly exercise minutes against your goal.'}, ${rule.aggregation}, ${rule.comparison})
      ON CONFLICT ("healthGoalId") DO NOTHING
    `;
    await this.goalsEngine.backfillJournalMetrics(goal.patientId);
    await this.goalsEngine.recomputeAllMatchingGoals(goal.patientId);
    return true;
  }

  async getActiveSnapshot(patientId: string) { return this.goalsEngine.snapshot(patientId); }

  async syncMetricEventForUser(userId: string, input: { metricType: string; metricKey: string; loggedValue: number; occurredAt?: Date; source?: string; sourceId?: string }) {
    const patient = await this.prisma.patient.findUnique({ where: { userId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient not found.');
    return this.goalsEngine.recordMetricEvent({ patientId: patient.id, ...input });
  }

  async getMetricEventsForUser(userId: string, input: { metricType: string; metricKey: string; source?: string; from: Date; to: Date }) {
    const patient = await this.prisma.patient.findUnique({ where: { userId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient not found.');
    if (Number.isNaN(input.from.getTime()) || Number.isNaN(input.to.getTime())) throw new BadRequestException('Metric event date range is invalid.');

    const queryEvents = () => this.prisma.$queryRaw<Array<{ id: string; loggedValue: Prisma.Decimal; occurredAt: Date; source: string; sourceId: string | null }>>`
      SELECT "id", "loggedValue", "occurredAt", "source", "sourceId"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patient.id}
        AND "metricType" = ${input.metricType}
        AND "metricKey" = ${input.metricKey}
        AND ${input.source ? Prisma.sql`"source" = ${input.source}` : Prisma.sql`TRUE`}
        AND "occurredAt" >= ${input.from}
        AND "occurredAt" < ${input.to}
      ORDER BY "occurredAt" ASC
    `;

    let rows = await queryEvents();

    if (rows.length === 0 && input.metricType === 'EXERCISE' && input.metricKey === 'exercise.minutes') {
      await this.goalsEngine.backfillJournalMetrics(patient.id);
      rows = await queryEvents();
    }

    return { count: rows.length, events: rows.map((row) => ({ id: row.id, loggedValue: Number(row.loggedValue), occurredAt: row.occurredAt, source: row.source, sourceId: row.sourceId })) };
  }

  async findAll(query: QueryHealthGoalDto) {
    const { page, limit, patientId, practitionerId, carePlanId, category, priority, status } = query;
    const where: Prisma.HealthGoalWhereInput = { patientId, practitionerId, carePlanId, category, priority, status };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.healthGoal.findMany({ where, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.healthGoal.count({ where }),
    ]);

    for (const goal of data) {
      await this.ensureOnboardingWeightGoalMetric(goal);
      await this.ensureOnboardingExerciseGoalMetric(goal);
    }

    const normalizedData = await Promise.all(data.map(async (goal) => {
      if (String(goal.category).toUpperCase() === 'MEDICATION' && goal.targetValue == null) {
        return { ...goal, targetValue: new Prisma.Decimal(DEFAULT_MEDICATION_TARGET), unit: '%' };
      }
      if (['WEIGHT', 'EXERCISE'].includes(String(goal.category).toUpperCase())) {
        const config = await this.prisma.$queryRaw<Array<{ frequencyTarget: Prisma.Decimal | number; frequency: string; aggregation: string; comparison: string; metricType: string; metricKey: string }>>`
          SELECT "frequencyTarget", "frequency", "aggregation", "comparison", "metricType", "metricKey"
          FROM "HealthGoalMetricConfig"
          WHERE "healthGoalId" = ${goal.id}
          LIMIT 1
        `;
        return { ...goal, metricConfig: config[0] ?? null };
      }
      return goal;
    }));

    const withMedicationAssociations = await this.attachMedicationGoalAssociations(normalizedData as any[]);
    return { data: withMedicationAssociations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const healthGoal = await this.prisma.healthGoal.findUnique({ where: { id }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } });
    if (!healthGoal) throw new NotFoundException('Health goal not found.');
    let result: any = healthGoal;
    if (String(healthGoal.category).toUpperCase() === 'MEDICATION' && healthGoal.targetValue == null) {
      result = await this.prisma.healthGoal.update({ where: { id }, data: { targetValue: String(DEFAULT_MEDICATION_TARGET), unit: '%' }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } });
    }
    const [hydrated] = await this.attachMedicationGoalAssociations([result] as any[]);
    return hydrated ?? result;
  }

  async update(id: string, dto: UpdateHealthGoalDto) {
    const existing = await this.findOne(id);
    const isMedicationGoal = String(existing.category).toUpperCase() === 'MEDICATION';
    const { patientMedicationId, ...goalData } = dto;
    if (patientMedicationId && String(goalData.category ?? existing.category).toUpperCase() !== 'MEDICATION') {
      throw new BadRequestException('A medication can only be attached to a medication goal.');
    }
    if (patientMedicationId) {
      await this.assertPatientMedicationBelongsToPatient(patientMedicationId, String(existing.patientId));
    }

    const updated = await this.prisma.healthGoal.update({
      where: { id },
      data: { ...goalData, ...(isMedicationGoal && goalData.targetValue == null ? { targetValue: String(DEFAULT_MEDICATION_TARGET) } : {}), ...(isMedicationGoal && goalData.unit == null ? { unit: '%' } : {}) },
      include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } },
    });

    if (patientMedicationId !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE "HealthGoal"
        SET "patientMedicationId" = ${patientMedicationId ?? null}
        WHERE "id" = ${id}
      `;
    }

    return this.findOne(id);
  }
}