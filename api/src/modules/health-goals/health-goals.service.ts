import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { HealthGoalCategory, HealthGoalPriority, HealthGoalProgressStatus, HealthGoalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { RecordHealthGoalProgressDto } from './dto/record-health-goal-progress.dto';
import { HealthGoalIntelligenceService } from './health-goal-intelligence.service';
import { goalRuleFor } from './goal-metric-rules';

const DEFAULT_MEDICATION_TARGET = 90;
type MedicationGoalAssociation = { healthGoalId: string; patientMedicationId: string | null; medicationId: string | null; medicationName: string | null; dosage: string | null; frequency: string | null };

@Injectable()
export class HealthGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthGoalIntelligence: HealthGoalIntelligenceService,
  ) {}
  async getActiveSnapshot(patientId: string) { return this.prisma.healthGoal.findMany({ where: { patientId, status: 'ACTIVE' } }); }

  async getMetricEventsForUser(userId: string, filters: any) {
    const patient = await this.findPatientForUser(userId); if (!patient) throw new NotFoundException('Patient not found.');
    const metricType = String(filters?.metricType ?? '').trim(); const metricKey = String(filters?.metricKey ?? '').trim(); const source = filters?.source ? String(filters.source).trim() : undefined; const from = filters?.from instanceof Date ? filters.from : new Date(filters?.from); const to = filters?.to instanceof Date ? filters.to : new Date(filters?.to);
    if (!metricType || !metricKey) throw new BadRequestException('Metric type and metric key are required.'); if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new BadRequestException('Metric event date range is invalid.');
    const events = await this.prisma.$queryRaw<Array<{ id: string; loggedValue: Prisma.Decimal; occurredAt: Date; source: string; sourceId: string | null }>>`SELECT "id", "loggedValue", "occurredAt", "source", "sourceId" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patient.id} AND "metricType" = ${metricType} AND "metricKey" = ${metricKey} AND "occurredAt" >= ${from} AND "occurredAt" < ${to} ${source ? Prisma.sql`AND "source" = ${source}` : Prisma.empty} ORDER BY "occurredAt" ASC`;
    return { success: true, count: events.length, events: events.map((event) => ({ id: String(event.id), loggedValue: Number(event.loggedValue), occurredAt: event.occurredAt, source: event.source, sourceId: event.sourceId })) };
  }

  async syncMetricEventForUser(userId: string, payload: { metricType: string; value?: number; [key: string]: any }) {
    const patient = await this.findPatientForUser(userId); if (!patient) throw new NotFoundException('Patient not found.');
    const metricType = String(payload?.metricType ?? '').trim().toUpperCase(); const metricKey = String(payload?.metricKey ?? '').trim(); const loggedValue = Number(payload?.loggedValue ?? payload?.value); const source = String(payload?.source ?? 'manual').trim(); const sourceId = payload?.sourceId ? String(payload.sourceId).trim() : null; const occurredAt = payload?.occurredAt instanceof Date ? payload?.occurredAt : payload?.occurredAt ? new Date(payload.occurredAt) : new Date();
    if (!metricType || !metricKey || !source || !Number.isFinite(loggedValue)) throw new BadRequestException('Metric event data is invalid.'); if (Number.isNaN(occurredAt.getTime())) throw new BadRequestException('Metric event date is invalid.');
    const existing = sourceId ? await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patient.id} AND "source" = ${source} AND "sourceId" = ${sourceId} LIMIT 1` : [];
    let eventId: string;
    if (existing.length) { eventId = String(existing[0].id); await this.prisma.$executeRaw`UPDATE "HealthGoalMetricEvent" SET "metricType" = ${metricType}, "metricKey" = ${metricKey}, "loggedValue" = ${loggedValue}, "occurredAt" = ${occurredAt}, "metadata" = ${payload?.metadata ? JSON.stringify(payload.metadata) : null}::jsonb WHERE "id" = ${eventId}::uuid`; }
    else { const inserted = await this.prisma.$queryRaw<Array<{ id: string }>>`INSERT INTO "HealthGoalMetricEvent" ("id", "patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId", "metadata") VALUES (gen_random_uuid(), ${patient.id}, ${metricType}, ${metricKey}, ${loggedValue}, ${occurredAt}, ${source}, ${sourceId}, ${payload?.metadata ? JSON.stringify(payload.metadata) : null}::jsonb) RETURNING "id"`; eventId = String(inserted[0].id); }
    await this.healthGoalIntelligence.recomputeMetric(patient.id, metricType, metricKey, occurredAt);
    const affectedGoals = await this.prisma.$queryRaw<Array<{ id: string; title: string; status: string }>>`SELECT DISTINCT hg."id", hg."title", hg."status"::text AS "status" FROM "HealthGoal" hg INNER JOIN "HealthGoalMetricConfig" hgm ON hgm."healthGoalId" = hg."id" WHERE hg."patientId" = ${patient.id} AND UPPER(hg."status"::text) IN ('ACTIVE', 'ON_HOLD') AND UPPER(hgm."metricType") = ${metricType} AND hgm."metricKey" = ${metricKey}`;
    return { success: true, eventId, affectedGoals };
  }

  async findPatientForUser(userId: string) { return this.prisma.patient.findUnique({ where: { userId } }); }

  async recomputeMetricForPatient(patientId: string, metricType: string, metricKey: string, at = new Date()) {
    return this.healthGoalIntelligence.recomputeMetric(patientId, metricType, metricKey, at);
  }

  private async assertPatientMedicationBelongsToPatient(patientMedicationId: string | undefined, patientId: string) { if (!patientMedicationId) return; const row = await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT pm."id" FROM "PatientMedication" pm INNER JOIN "HealthPassport" hp ON hp."id" = pm."healthPassportId" WHERE pm."id" = ${patientMedicationId} AND hp."patientId" = ${patientId} LIMIT 1`; if (!row.length) throw new BadRequestException('The selected medication does not belong to this patient.'); }
  private async medicationGoalAssociations(goalIds: string[]): Promise<MedicationGoalAssociation[]> { if (!goalIds.length) return []; return this.prisma.$queryRaw<MedicationGoalAssociation[]>`SELECT hg."id" AS "healthGoalId", hg."patientMedicationId", pm."medicationId", m."name" AS "medicationName", pm."dosage", pm."frequency" FROM "HealthGoal" hg LEFT JOIN "PatientMedication" pm ON pm."id" = hg."patientMedicationId" LEFT JOIN "Medication" m ON m."id" = pm."medicationId" WHERE hg."id" IN (${Prisma.join(goalIds)})`; }
  private async attachMedicationGoalAssociations<T extends { id: string; category?: unknown; title?: unknown; description?: unknown; patientId?: string }>(goals: T[]) {
    const medicationGoals = goals.filter((goal) => String(goal?.category ?? '').toUpperCase() === 'MEDICATION'); if (!medicationGoals.length) return goals;
    const associations = await this.medicationGoalAssociations(medicationGoals.map((goal) => goal.id)); const byGoalId = new Map(associations.map((row) => [String(row.healthGoalId), row])); const patients = [...new Set(medicationGoals.map((goal) => goal.patientId).filter(Boolean))] as string[];
    const legacyMedicationRows = patients.length ? await this.prisma.$queryRaw<Array<{ patientId: string; patientMedicationId: string; medicationId: string; medicationName: string; dosage: string | null; frequency: string | null }>>`SELECT hp."patientId", pm."id" AS "patientMedicationId", pm."medicationId", m."name" AS "medicationName", pm."dosage", pm."frequency" FROM "PatientMedication" pm INNER JOIN "HealthPassport" hp ON hp."id" = pm."healthPassportId" INNER JOIN "Medication" m ON m."id" = pm."medicationId" WHERE hp."patientId" IN (${Prisma.join(patients)}) AND pm."status" = 'ACTIVE'` : [];
    const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return goals.map((goal) => { const direct = byGoalId.get(String(goal.id)); if (direct?.patientMedicationId) return { ...goal, patientMedicationId: direct.patientMedicationId, medicationId: direct.medicationId, medication: { id: direct.medicationId, name: direct.medicationName }, medicationDosage: direct.dosage, medicationFrequency: direct.frequency }; const title = normalise(goal.title); const description = normalise(goal.description); const candidates = legacyMedicationRows.filter((row) => { if (!goal.patientId || row.patientId !== goal.patientId) return false; const name = normalise(row.medicationName); return Boolean(name) && (title === name || title.includes(name) || description.includes(name)); }); const uniqueMatch = candidates.length === 1 ? candidates[0] : null; if (!uniqueMatch) return goal; return { ...goal, patientMedicationId: uniqueMatch.patientMedicationId, medicationId: uniqueMatch.medicationId, medication: { id: uniqueMatch.medicationId, name: uniqueMatch.medicationName }, medicationDosage: uniqueMatch.dosage, medicationFrequency: uniqueMatch.frequency }; });
  }

  public async captureWeightGoalBaseline(goalId: string, patientId: string, baselineAt: Date) {
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = 'WEIGHT' AND "metricKey" = 'weight.kg' AND "source" = 'goal-baseline' AND "sourceId" = ${goalId} LIMIT 1`;
    const latest = await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal }>>`SELECT "loggedValue" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = 'WEIGHT' AND "metricKey" = 'weight.kg' AND "source" <> 'goal-baseline' AND "occurredAt" <= ${baselineAt} ORDER BY "occurredAt" DESC LIMIT 1`;
    let baseline = latest.length ? Number(latest[0].loggedValue) : null;
    if (baseline == null) { const patient = await this.prisma.patient.findUnique({ where: { id: patientId }, select: { weightKg: true } }); baseline = patient?.weightKg == null ? null : Number(patient.weightKg); }
    if (baseline == null || !Number.isFinite(baseline)) return null;
    if (existing.length) {
      await this.prisma.$executeRaw`UPDATE "HealthGoalMetricEvent" SET "loggedValue" = ${baseline}, "occurredAt" = ${baselineAt} WHERE "id" = ${existing[0].id}::uuid`;
      return baseline;
    }
    await this.prisma.$executeRaw`INSERT INTO "HealthGoalMetricEvent" ("id","patientId","metricType","metricKey","loggedValue","occurredAt","source","sourceId") VALUES (gen_random_uuid(),${patientId},'WEIGHT','weight.kg',${baseline},${baselineAt},'goal-baseline',${goalId})`;
    return baseline;
  }

  private async ensureOnboardingWeightGoalMetric(goal: any) {
    if (String(goal?.category ?? '').toUpperCase() !== 'WEIGHT') return goal;
    const patientId = String(goal.patientId); const goalId = String(goal.id); const createdAt = new Date(goal.createdAt);
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "HealthGoalMetricEvent" WHERE "patientId" = ${patientId} AND "metricType" = 'WEIGHT' AND "metricKey" = 'weight.kg' AND "source" = 'goal-baseline' AND "sourceId" = ${goalId} LIMIT 1`;
    if (existing.length) return goal;
    if (!Number.isNaN(createdAt.getTime())) await this.captureWeightGoalBaseline(goalId, patientId, createdAt);
    return goal;
  }
  private async ensureOnboardingExerciseGoalMetric(goal: any) { return goal; }

  private canonicalMetricConfig(category: string, config: any) {
    const normalizedCategory = String(category ?? 'OTHER').toUpperCase();
    const rule = goalRuleFor(normalizedCategory);
    return {
      metricType: rule.metricType,
      metricKey: rule.metricKey,
      frequency: rule.frequency,
      frequencyTarget: config?.frequencyTarget == null ? null : Number(config.frequencyTarget),
      aggregation: rule.aggregation,
      comparison: config?.comparison ?? rule.comparison,
      guidanceText: config?.guidanceText ?? null,
    };
  }

  private async ensureMetricConfigStorage() {
    await this.prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HealthGoalMetricConfig" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "healthGoalId" TEXT NOT NULL,
        "metricType" VARCHAR(64) NOT NULL,
        "metricKey" VARCHAR(128) NOT NULL,
        "frequency" VARCHAR(16) NOT NULL DEFAULT 'DAILY',
        "frequencyTarget" NUMERIC(12,2),
        "guidanceText" TEXT,
        "aggregation" VARCHAR(16) NOT NULL DEFAULT 'SUM',
        "comparison" VARCHAR(16) NOT NULL DEFAULT 'AT_LEAST',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HealthGoalMetricConfig_pkey" PRIMARY KEY ("id")
      )
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE "HealthGoalMetricConfig"
        ADD COLUMN IF NOT EXISTS "healthGoalId" TEXT,
        ADD COLUMN IF NOT EXISTS "metricType" VARCHAR(64),
        ADD COLUMN IF NOT EXISTS "metricKey" VARCHAR(128),
        ADD COLUMN IF NOT EXISTS "frequency" VARCHAR(16) DEFAULT 'DAILY',
        ADD COLUMN IF NOT EXISTS "frequencyTarget" NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS "guidanceText" TEXT,
        ADD COLUMN IF NOT EXISTS "aggregation" VARCHAR(16) DEFAULT 'SUM',
        ADD COLUMN IF NOT EXISTS "comparison" VARCHAR(16) DEFAULT 'AT_LEAST',
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "HealthGoalMetricConfig_healthGoalId_key"
        ON "HealthGoalMetricConfig" ("healthGoalId")
    `);
  }

  public async configureMetric(goalId: string, config: any) {
    await this.ensureMetricConfigStorage();
    const goal = await this.prisma.healthGoal.findUnique({ where: { id: goalId }, select: { status: true, category: true, targetValue: true } });
    if (!goal) throw new NotFoundException('Health goal not found.');
    if (String(goal.status).toUpperCase() === 'ACHIEVED') throw new BadRequestException('Completed health goals are locked. Start a new goal instead.');
    const canonical = this.canonicalMetricConfig(String(goal.category), { ...config, frequencyTarget: config?.frequencyTarget ?? goal.targetValue });
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "HealthGoalMetricConfig" WHERE "healthGoalId" = ${goalId} LIMIT 1`;
    if (existing.length) await this.prisma.$executeRaw`UPDATE "HealthGoalMetricConfig" SET "metricType" = ${canonical.metricType}, "metricKey" = ${canonical.metricKey}, "frequency" = ${canonical.frequency}, "frequencyTarget" = ${canonical.frequencyTarget}, "aggregation" = ${canonical.aggregation}, "comparison" = ${canonical.comparison}, "guidanceText" = ${canonical.guidanceText} WHERE "id" = ${existing[0].id}`;
    else await this.prisma.$executeRaw`INSERT INTO "HealthGoalMetricConfig" ("id", "healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "aggregation", "comparison", "guidanceText") VALUES (gen_random_uuid(), ${goalId}, ${canonical.metricType}, ${canonical.metricKey}, ${canonical.frequency}, ${canonical.frequencyTarget}, ${canonical.aggregation}, ${canonical.comparison}, ${canonical.guidanceText})`;
    return canonical;
  }

  private assertGoalDefinition(category: string, targetValue: unknown, targetDate?: unknown) {
    const normalizedCategory = String(category ?? 'OTHER').toUpperCase();
    const target = Number(targetValue);
    if (targetValue == null || !Number.isFinite(target)) throw new BadRequestException('A valid numeric goal target is required.');

    const allowsZero = normalizedCategory === 'SMOKING' || normalizedCategory === 'ALCOHOL';
    if (target < 0 || (target === 0 && !allowsZero)) {
      throw new BadRequestException(allowsZero ? 'This goal target must be 0 or greater.' : 'This goal target must be greater than 0.');
    }
    if (normalizedCategory === 'MEDICATION' && (target < 1 || target > 100)) {
      throw new BadRequestException('Medication adherence goals must be between 1% and 100%.');
    }
    if (normalizedCategory === 'MENTAL_HEALTH' && (target < 1 || target > 10)) {
      throw new BadRequestException('Mental health stress goals must be between 1 and 10.');
    }
    if (normalizedCategory === 'BLOOD_PRESSURE' && (target < 40 || target > 300)) {
      throw new BadRequestException('Blood pressure targets must be within the supported measurement range.');
    }
    if (normalizedCategory === 'BLOOD_GLUCOSE' && (target < 0.1 || target > 50)) {
      throw new BadRequestException('Blood glucose targets must be within the supported measurement range.');
    }
    if (normalizedCategory === 'CHOLESTEROL' && (target < 0.1 || target > 30)) {
      throw new BadRequestException('Cholesterol targets must be within the supported measurement range.');
    }
    if (normalizedCategory === 'SLEEP' && (target <= 0 || target > 24)) {
      throw new BadRequestException('Sleep targets must be greater than 0 and no more than 24 hours.');
    }
    if (normalizedCategory === 'HYDRATION' && (target <= 0 || target > 50000)) {
      throw new BadRequestException('Hydration targets must be within the supported daily measurement range.');
    }
    if (normalizedCategory === 'HEART_RATE' && (target < 20 || target > 260)) {
      throw new BadRequestException('Heart-rate targets must be within the supported measurement range.');
    }
    if (normalizedCategory === 'WEIGHT' && target <= 0) {
      throw new BadRequestException('Weight targets must be greater than 0.');
    }

    if (targetDate != null && String(targetDate).trim() !== '') {
      const date = new Date(String(targetDate));
      if (Number.isNaN(date.getTime())) throw new BadRequestException('Target date is invalid.');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) throw new BadRequestException('Target date cannot be in the past.');
    }
  }

  private async assertNoDuplicateGoal(
    patientId: string,
    category: string,
    patientMedicationId?: string | null,
    excludeGoalId?: string,
  ) {
    const normalizedCategory = String(category ?? '').toUpperCase();
    if (!patientId || !normalizedCategory) return;

    const where: any = {
      patientId,
      category: normalizedCategory,
      status: { in: ['ACTIVE', 'ON_HOLD'] },
      ...(excludeGoalId ? { NOT: { id: excludeGoalId } } : {}),
    };

    if (normalizedCategory === 'MEDICATION') {
      if (!patientMedicationId) {
        throw new BadRequestException('A medication goal must be linked to a prescribed medication.');
      }
      where.patientMedicationId = patientMedicationId;
    }

    const existing = await this.prisma.healthGoal.findFirst({
      where,
      select: { id: true, title: true, category: true, patientMedicationId: true },
    });

    if (!existing) return;

    const label = normalizedCategory === 'MEDICATION' ? 'for the selected medication' : 'in this category';
    throw new ConflictException(
      `You already have an active ${normalizedCategory.toLowerCase().replaceAll('_', ' ')} goal ${label}. Edit the existing goal instead of creating a duplicate.`,
    );
  }

  private async assertWeightTargetDirection(patientId: string, targetValue: unknown, comparison: unknown) {
    const direction = String(comparison ?? '').toUpperCase();
    if (direction !== 'INCREASE_TO' && direction !== 'DECREASE_TO') return;
    const requestedChangeKg = Number(targetValue);
    if (!Number.isFinite(requestedChangeKg) || requestedChangeKg <= 0) {
      throw new BadRequestException('Weight change must be a positive number.');
    }
    if (direction !== 'DECREASE_TO') return;

    const rows = await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal }>>`
      SELECT "loggedValue"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patientId}
        AND "metricType" = 'WEIGHT'
        AND "metricKey" = 'weight.kg'
        AND "source" <> 'goal-baseline'
      ORDER BY "occurredAt" DESC
      LIMIT 1
    `;
    const fallbackPatient = rows.length
      ? Number(rows[0].loggedValue)
      : Number((await this.prisma.patient.findUnique({ where: { id: patientId }, select: { weightKg: true } }))?.weightKg);
    if (!Number.isFinite(fallbackPatient)) return;
    if (requestedChangeKg >= fallbackPatient) {
      throw new BadRequestException(`A weight-loss goal cannot request ${requestedChangeKg.toFixed(1)} kg or more when the current recorded weight is ${fallbackPatient.toFixed(1)} kg. The projected destination must remain above 0 kg.`);
    }
  }

  async create(dto: CreateHealthGoalDto) {
    /*
     * Normalize the external payload once, before any persistence.
     * The frontend sends several numeric/string values as strings, while
     * Prisma expects the canonical enum members and numeric values that map
     * cleanly to the database contract.
     *
     * Do not replace the transactional create below with a bare
     * healthGoal.create(): the metric-config row is part of the same
     * creation contract and must succeed atomically.
     */
    const cleanCategory = String(dto.category ?? 'MEDICATION')
      .trim()
      .toUpperCase() as HealthGoalCategory;
    const cleanPriority = String(dto.priority ?? 'MEDIUM')
      .trim()
      .toUpperCase() as HealthGoalPriority;
    const cleanStatus = String(dto.status ?? 'ACTIVE')
      .trim()
      .toUpperCase() as HealthGoalStatus;

    const rawTargetValue =
      dto.targetValue == null || String(dto.targetValue).trim() === ''
        ? cleanCategory === HealthGoalCategory.MEDICATION
          ? '90'
          : undefined
        : dto.targetValue;

    const numericTargetValue =
      rawTargetValue == null ? undefined : Number(rawTargetValue);

    if (
      numericTargetValue !== undefined &&
      (!Number.isFinite(numericTargetValue) || numericTargetValue < 0)
    ) {
      throw new BadRequestException('A valid non-negative numeric goal target is required.');
    }

    const cleanPatientMedicationId = dto.patientMedicationId
      ? String(dto.patientMedicationId).trim()
      : null;

    console.log('[GOALS AUDIT] Normalized creation payload:', {
      patientId: dto.patientId,
      category: cleanCategory,
      priority: cleanPriority,
      status: cleanStatus,
      patientMedicationId: cleanPatientMedicationId,
      targetValue: numericTargetValue,
      unit: dto.unit ?? (cleanCategory === HealthGoalCategory.MEDICATION ? '%' : null),
    });

    const normalizedDto: CreateHealthGoalDto = {
      ...dto,
      category: cleanCategory,
      priority: cleanPriority,
      status: cleanStatus,
      patientMedicationId: cleanPatientMedicationId ?? undefined,
      ...(numericTargetValue == null
        ? cleanCategory === HealthGoalCategory.MEDICATION
          ? { targetValue: '90' }
          : {}
        : { targetValue: String(numericTargetValue) }),
      ...(dto.unit == null && cleanCategory === HealthGoalCategory.MEDICATION
        ? { unit: '%' }
        : {}),
    };

    const {
      metricType,
      metricKey,
      frequency,
      frequencyTarget,
      aggregation,
      comparison,
      guidanceText,
      patientMedicationId,
      targetDate,
      achievedAt,
      ...goalData
    } = normalizedDto;

    const parsedTargetDate = targetDate ? new Date(targetDate) : undefined;
    const parsedAchievedAt = achievedAt ? new Date(achievedAt) : undefined;
    if (parsedTargetDate && Number.isNaN(parsedTargetDate.getTime())) {
      throw new BadRequestException('Target date is invalid.');
    }
    if (parsedAchievedAt && Number.isNaN(parsedAchievedAt.getTime())) {
      throw new BadRequestException('Achievement date is invalid.');
    }

    const category = String(goalData.category).toUpperCase();
    const isMedicationGoal = category === 'MEDICATION';

    if (patientMedicationId && !isMedicationGoal) {
      throw new BadRequestException('A medication can only be attached to a medication goal.');
    }

    const patientId = String(goalData.patientId);

    // Non-medication duplicates can be checked normally. Medication goals are
    // checked inside the same transaction as the authoritative PatientMedication
    // ownership check and primary HealthGoal write.
    if (category !== 'MEDICATION') {
      await this.assertNoDuplicateGoal(patientId, category, patientMedicationId ?? null);
    }

    const targetValue =
      goalData.targetValue ?? (isMedicationGoal ? String(DEFAULT_MEDICATION_TARGET) : undefined);
    const unit = goalData.unit ?? (isMedicationGoal ? '%' : undefined);

    this.assertGoalDefinition(category, targetValue, targetDate);

    const effectiveComparison =
      category === 'WEIGHT' ? (comparison ?? 'DECREASE_TO') : comparison;

    if (category === 'WEIGHT') {
      await this.assertWeightTargetDirection(patientId, targetValue, effectiveComparison);
    }

    /*
     * Goal persistence and its metric contract are one unit of work.
     * A goal must never become visible to Today unless its tracking
     * configuration was stored successfully as well.
     *
     * The migration chain is now the authoritative owner of the metric
     * tables, so creation does not run DDL on the request path.
     */
    const metricConfig = this.canonicalMetricConfig(category, {
      metricType: metricType ?? goalRuleFor(category).metricType,
      metricKey: metricKey ?? goalRuleFor(category).metricKey,
      frequency: frequency ?? goalRuleFor(category).frequency,
      frequencyTarget:
        frequencyTarget == null
          ? targetValue == null
            ? null
            : Number(targetValue)
          : Number(frequencyTarget),
      aggregation: aggregation ?? goalRuleFor(category).aggregation,
      comparison: effectiveComparison ?? goalRuleFor(category).comparison,
      guidanceText,
    });

    let goal;
    try {
      goal = await this.prisma.$transaction(async (tx) => {
        // Validate the relational token against the patient's actual saved
        // PatientMedication row before the HealthGoal insert.
        if (patientMedicationId) {
          const ownedMedication = await tx.patientMedication.findFirst({
            where: {
              id: patientMedicationId,
              healthPassport: { patientId },
            },
            select: { id: true },
          });

          if (!ownedMedication) {
            throw new BadRequestException(
              'The selected medication is not saved for this patient. Refresh and select a saved prescribed medication.',
            );
          }
        }

        // Race-safe duplicate check for medication goals. Only statuses that
        // actually exist in HealthGoalStatus are used here.
        if (category === 'MEDICATION') {
          const duplicate = await tx.healthGoal.findFirst({
            where: {
              patientId,
              patientMedicationId: patientMedicationId ?? null,
              category: 'MEDICATION',
              status: { in: ['ACTIVE', 'ON_HOLD'] },
            },
            include: {
              patient: true,
              practitioner: true,
              carePlan: true,
              progress: true,
            },
          });

          if (duplicate) return duplicate;
        }

        return tx.healthGoal.create({
          data: {
            ...goalData,
            patientId,
            ...(patientMedicationId ? { patientMedicationId } : {}),
            ...(targetValue !== undefined ? { targetValue } : {}),
            ...(unit !== undefined ? { unit } : {}),
            ...(targetDate !== undefined ? { targetDate: parsedTargetDate } : {}),
            ...(achievedAt !== undefined ? { achievedAt: parsedAchievedAt } : {}),
          },
          include: {
            patient: true,
            practitioner: true,
            carePlan: true,
            progress: true,
          },
        });
      });
    } catch (error: unknown) {
      console.error(
        'Health goal primary transaction failed:',
        error instanceof Error ? error.stack ?? error.message : String(error),
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            isMedicationGoal
              ? 'An active medication goal already exists for the selected prescribed medication.'
              : 'An active health goal already exists in this category.',
          );
        }

        if (error.code === 'P2003') {
          throw new BadRequestException(
            'The selected medication reference is invalid. Please select a valid saved medication.',
          );
        }
      }

      throw error;
    }
    let metricConfigReady = false;
    let metricConfigFallbackUsed = false;

    try {
      const metricConfigId = randomUUID();

      // First attempt: write the complete current metric contract.
      await this.prisma.$executeRaw`
        INSERT INTO "HealthGoalMetricConfig"
          ("id", "healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "aggregation", "comparison", "guidanceText")
        VALUES
          (${metricConfigId}::uuid, ${goal.id}::text, ${metricConfig.metricType}, ${metricConfig.metricKey}, ${metricConfig.frequency}, ${metricConfig.frequencyTarget}, ${metricConfig.aggregation}, ${metricConfig.comparison}, ${metricConfig.guidanceText})
      `;

      metricConfigReady = true;
    } catch (configError: unknown) {
      console.warn(
        '⚠️ Full health-goal metric configuration write failed; attempting minimal-schema fallback.',
        configError instanceof Error ? configError.message : String(configError),
      );

      try {
        const fallbackMetricConfigId = randomUUID();

        // Minimal fallback intentionally uses only the columns that are
        // foundational to the metric contract. The migration defaults supply
        // optional aggregation/comparison values if those columns exist.
        await this.prisma.$executeRaw`
          INSERT INTO "HealthGoalMetricConfig"
            ("id", "healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget")
          VALUES
            (${fallbackMetricConfigId}::uuid, ${goal.id}::text, ${metricConfig.metricType}, ${metricConfig.metricKey}, ${metricConfig.frequency}, ${metricConfig.frequencyTarget})
        `;

        metricConfigReady = true;
        metricConfigFallbackUsed = true;

        console.warn(
          '✅ Minimal health-goal metric configuration fallback succeeded.',
          { goalId: goal.id },
        );
      } catch (fallbackError: unknown) {
        // Do not delete a valid primary goal because optional tracking
        // metadata could not bind. The goal remains visible, while the server
        // records that metric configuration needs repair.
        console.error(
          '❌ Health-goal metric configuration fallback also failed.',
          fallbackError instanceof Error
            ? fallbackError.stack ?? fallbackError.message
            : String(fallbackError),
        );
      }
    }
    if (category === 'WEIGHT') {
      await this.captureWeightGoalBaseline(goal.id, patientId, goal.createdAt);
    }

    try {
      await this.healthGoalIntelligence.syncGoalRelations(patientId);
    } catch (error) {
      console.error(
        'Health goal relation sync failed after creation:',
        error instanceof Error ? error.message : String(error),
      );
    }

    return {
      ...goal,
      metricConfig: {
        metricType: metricType ?? goalRuleFor(category).metricType,
        metricKey: metricKey ?? goalRuleFor(category).metricKey,
        frequency: frequency ?? goalRuleFor(category).frequency,
        frequencyTarget:
          frequencyTarget == null
            ? targetValue == null
              ? null
              : Number(targetValue)
            : Number(frequencyTarget),
        aggregation: aggregation ?? goalRuleFor(category).aggregation,
        comparison: effectiveComparison ?? goalRuleFor(category).comparison,
        guidanceText: guidanceText ?? null,
        status: metricConfigReady ? 'READY' : 'PENDING_REPAIR',
        fallbackUsed: metricConfigFallbackUsed,
      },
    };
  }
  async findAll(query: QueryHealthGoalDto) {
    const patientId = String(query?.patientId ?? '').trim();

    try {
      const healthGoalsList = await this.prisma.healthGoal.findMany({
        where: {
          ...(patientId ? { patientId } : {}),
          ...(query?.practitionerId ? { practitionerId: query.practitionerId } : {}),
          ...(query?.carePlanId ? { carePlanId: query.carePlanId } : {}),
          ...(query?.category ? { category: query.category } : {}),
          ...(query?.priority ? { priority: query.priority } : {}),
          ...(query?.status ? { status: query.status } : {}),
        },
        include: {
          patientMedication: {
            include: {
              medication: true,
            },
          },
          progress: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Optional enrichments must never take down the core goals list.
      const data = await Promise.all(
        healthGoalsList.map(async (goal: any) => {
          let metricConfig: any = null;

          try {
            const configRows = await this.prisma.$queryRaw<any[]>`
              SELECT
                "id",
                "healthGoalId",
                "metricType",
                "metricKey",
                "frequency",
                "frequencyTarget",
                "aggregation",
                "comparison",
                "guidanceText"
              FROM "HealthGoalMetricConfig"
              WHERE "healthGoalId" = ${goal.id}
              LIMIT 1
            `;
            metricConfig = configRows[0] ?? null;
          } catch (error: unknown) {
            console.warn(
              "HealthGoalMetricConfig enrichment unavailable; returning core goal data.",
              error instanceof Error ? error.message : String(error),
            );
          }

          return {
            ...goal,
            metricConfig,
          };
        }),
      );

      let enrichedData = data as any[];
      try {
        enrichedData = await this.healthGoalIntelligence.attachRelationships(
          data as any[],
        );
      } catch (error: unknown) {
        console.warn(
          "Health goal relationship enrichment unavailable; returning goals without relationships.",
          error instanceof Error ? error.message : String(error),
        );
        enrichedData = data.map((goal: any) => ({
          ...goal,
          connectedGoals: [],
        }));
      }
      return {
        success: true,
        statusCode: 200,
        data: enrichedData,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ FATAL HEALTH GOALS LISTING FAILURE:', message);
      throw new InternalServerErrorException(
        `Database query failed: ${message}`,
      );
    }
  }

  async findOne(id: string) { const healthGoal = await this.prisma.healthGoal.findUnique({ where: { id }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } }); if (!healthGoal) throw new NotFoundException('Health goal not found.'); let result: any = healthGoal; if (String(healthGoal.category).toUpperCase() === 'MEDICATION' && healthGoal.targetValue == null) result = await this.prisma.healthGoal.update({ where: { id }, data: { targetValue: String(DEFAULT_MEDICATION_TARGET), unit: '%' }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } }); const [hydrated] = await this.attachMedicationGoalAssociations([result] as any[]); const [withRelationships] = await this.healthGoalIntelligence.attachRelationships([(hydrated ?? result) as any]); return withRelationships ?? hydrated ?? result; }
  async update(id: string, dto: UpdateHealthGoalDto) {
    const existing = await this.findOne(id);
    const existingStatus = String(existing.status ?? 'ACTIVE').toUpperCase();
    if (existingStatus === 'ACHIEVED') throw new BadRequestException('Completed health goals are locked. Start a new goal instead.');
    const isMedicationGoal = String(existing.category).toUpperCase() === 'MEDICATION';
    const { patientMedicationId, metricType, metricKey, frequency, frequencyTarget, aggregation, comparison, guidanceText, ...goalData } = dto as any;
    const existingCategory = String(existing.category).toUpperCase();
    const targetCategory = String(goalData.category ?? existing.category).toUpperCase();
    if (targetCategory !== existingCategory) throw new BadRequestException('A goal category cannot be changed after it is created. Start a new goal for a different category.');
    if (patientMedicationId && targetCategory !== 'MEDICATION') throw new BadRequestException('A medication can only be attached to a medication goal.');
    if (patientMedicationId) await this.assertPatientMedicationBelongsToPatient(patientMedicationId, String(existing.patientId));
    this.assertGoalDefinition(targetCategory, goalData.targetValue ?? existing.targetValue, goalData.targetDate ?? existing.targetDate);
    const revisingWeightGoal = targetCategory === 'WEIGHT';
    let effectiveComparison: string | undefined = comparison;
    if (revisingWeightGoal) {
      const existingConfig = comparison
        ? null
        : await this.prisma.$queryRaw<Array<{ comparison: string | null }>>`
            SELECT "comparison"
            FROM "HealthGoalMetricConfig"
            WHERE "healthGoalId" = ${id}
            LIMIT 1
          `;
      effectiveComparison = comparison ?? existingConfig?.[0]?.comparison ?? 'DECREASE_TO';
      await this.assertWeightTargetDirection(String(existing.patientId), goalData.targetValue ?? existing.targetValue, effectiveComparison);
    }
    const metricComparison = revisingWeightGoal ? effectiveComparison : comparison;
    if (isMedicationGoal && patientMedicationId !== undefined) {
      await this.assertNoDuplicateGoal(String(existing.patientId), targetCategory, patientMedicationId ?? null, id);
    }
    const updateData: any = {
      ...goalData,
      ...(isMedicationGoal && goalData.targetValue == null ? { targetValue: String(DEFAULT_MEDICATION_TARGET) } : {}),
      ...(isMedicationGoal && goalData.unit == null ? { unit: '%' } : {}),
      ...(revisingWeightGoal ? { status: 'ACTIVE', currentValue: null, achievedAt: null } : {}),
    };
    await this.prisma.$transaction(async (tx) => {
      if (revisingWeightGoal) await tx.healthGoalProgress.deleteMany({ where: { healthGoalId: id } });
      await tx.healthGoal.update({ where: { id }, data: updateData });
      if (patientMedicationId !== undefined) await tx.$executeRaw`UPDATE "HealthGoal" SET "patientMedicationId" = ${patientMedicationId ?? null} WHERE "id" = ${id}`;
    });
    if (revisingWeightGoal) {
      await this.captureWeightGoalBaseline(id, String(existing.patientId), new Date());
    }
    await this.configureMetric(id, {
      metricType,
      metricKey,
      frequency,
      frequencyTarget: frequencyTarget == null ? (goalData.targetValue ?? existing.targetValue) : frequencyTarget,
      aggregation,
      comparison: metricComparison,
      guidanceText,
    });
    await this.healthGoalIntelligence.syncGoalRelations(String(existing.patientId));
    return this.findOne(id);
  }
  async recordProgress(id: string, dto: RecordHealthGoalProgressDto) {
    const goal = await this.findOne(id);
    const currentValue = Number(dto.currentValue);
    if (!Number.isFinite(currentValue)) throw new BadRequestException('Health goal progress value is invalid.');

    const configs = await this.prisma.$queryRaw<Array<{ comparison: string | null; frequency: string | null }>>`
      SELECT "comparison","frequency"
      FROM "HealthGoalMetricConfig"
      WHERE "healthGoalId" = ${id}
      LIMIT 1
    `;
    const comparison = String(configs[0]?.comparison ?? '').toUpperCase();
    const frequency = String(configs[0]?.frequency ?? '').toUpperCase();
    const recurring = frequency === 'DAILY' || frequency === 'WEEKLY';
    const isWeightGoal = String(goal.category ?? '').toUpperCase() === 'WEIGHT' && (comparison === 'INCREASE_TO' || comparison === 'DECREASE_TO' || comparison === 'CLOSEST');

    let progressPercent = 0;
    let progressStatus: HealthGoalProgressStatus;
    let terminal = false;

    if (isWeightGoal) {
      const baselineRows = await this.prisma.$queryRaw<Array<{ loggedValue: Prisma.Decimal }>>`
        SELECT "loggedValue"
        FROM "HealthGoalMetricEvent"
        WHERE "patientId" = ${goal.patientId}
          AND "metricType" = 'WEIGHT'
          AND "metricKey" = 'weight.kg'
          AND "source" = 'goal-baseline'
          AND "sourceId" = ${id}
        LIMIT 1
      `;
      const baseline = baselineRows.length ? Number(baselineRows[0].loggedValue) : null;
      const requestedChangeKg = goal.targetValue == null ? null : Math.abs(Number(goal.targetValue));

      if (baseline == null || !Number.isFinite(baseline) || requestedChangeKg == null || !Number.isFinite(requestedChangeKg)) {
        progressStatus = HealthGoalProgressStatus.IMPROVING;
      } else if (comparison === 'CLOSEST') {
        const maintenanceToleranceKg = Math.max(0.5, Math.abs(baseline) * 0.02);
        const deviation = Math.abs(currentValue - baseline);
        progressPercent = Math.max(0, Math.min(100, (1 - (deviation / Math.max(Math.abs(baseline), 0.0001))) * 100));
        progressStatus = deviation <= maintenanceToleranceKg
          ? HealthGoalProgressStatus.ON_TRACK
          : currentValue > baseline
            ? HealthGoalProgressStatus.DECLINING
            : HealthGoalProgressStatus.IMPROVING;
      }    } else {
      const targetValue = goal.targetValue == null ? null : Number(goal.targetValue);
      const previousValue = goal.currentValue == null ? null : Number(goal.currentValue);
      const isMaintenanceGoal = comparison === 'CLOSEST';
      progressPercent = targetValue != null && targetValue > 0
        ? Math.min(100, Math.max(0, (currentValue / targetValue) * 100))
        : 0;
      if (isMaintenanceGoal) {
        progressStatus = HealthGoalProgressStatus.ON_TRACK;
      } else if (targetValue != null && targetValue > 0 && currentValue >= targetValue) {
        progressStatus = recurring ? HealthGoalProgressStatus.ON_TRACK : HealthGoalProgressStatus.ACHIEVED;
        terminal = progressStatus === HealthGoalProgressStatus.ACHIEVED;
      } else {
        progressStatus = previousValue == null
          ? HealthGoalProgressStatus.IMPROVING
          : currentValue > previousValue
            ? HealthGoalProgressStatus.IMPROVING
            : currentValue < previousValue
              ? HealthGoalProgressStatus.DECLINING
              : HealthGoalProgressStatus.STAGNANT;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.healthGoal.update({
        where: { id },
        data: {
          currentValue: String(currentValue),
          status: terminal ? 'ACHIEVED' : goal.status,
          achievedAt: terminal ? new Date() : null,
        },
      });
      await tx.healthGoalProgress.create({
        data: {
          healthGoalId: id,
          currentValue: String(currentValue),
          progressPercent: String(progressPercent.toFixed(2)),
          status: progressStatus,
          notes: dto.notes,
          measuredAt: new Date(),
        },
      });
      return tx.healthGoal.findUnique({
        where: { id },
        include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' }, take: 1 } },
      });
    });
  }
  async remove(id: string) {
    const goal = await this.prisma.healthGoal.findUnique({ where: { id }, select: { id: true } });
    if (!goal) throw new NotFoundException('Health goal not found.');
    await this.prisma.healthGoal.delete({ where: { id } });
    return { message: 'Health goal deleted successfully.' };
  }
}