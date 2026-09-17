import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, HealthGoalProgressStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { RecordHealthGoalProgressDto } from './dto/record-health-goal-progress.dto';

const DEFAULT_MEDICATION_TARGET = 90;

type MedicationGoalAssociation = { healthGoalId: string; patientMedicationId: string | null; medicationId: string | null; medicationName: string | null; dosage: string | null; frequency: string | null };

@Injectable()
export class HealthGoalsService {
  constructor(private readonly prisma: PrismaService) {}
  async getActiveSnapshot(patientId: string) { return this.prisma.healthGoal.findMany({ where: { patientId, status: 'ACTIVE' } }); }

  async getMetricEventsForUser(userId: string, filters: any) {
    const patient = await this.findPatientForUser(userId);
    if (!patient) throw new NotFoundException('Patient not found.');
    const metricType = String(filters?.metricType ?? '').trim();
    const metricKey = String(filters?.metricKey ?? '').trim();
    const source = filters?.source ? String(filters.source).trim() : undefined;
    const from = filters?.from instanceof Date ? filters.from : new Date(filters?.from);
    const to = filters?.to instanceof Date ? filters.to : new Date(filters?.to);
    if (!metricType || !metricKey) throw new BadRequestException('Metric type and metric key are required.');
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new BadRequestException('Metric event date range is invalid.');
    const events = await this.prisma.$queryRaw<Array<{ id: string; loggedValue: Prisma.Decimal; occurredAt: Date; source: string; sourceId: string | null }>>`
      SELECT "id", "loggedValue", "occurredAt", "source", "sourceId"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patient.id}
        AND "metricType" = ${metricType}
        AND "metricKey" = ${metricKey}
        AND "occurredAt" >= ${from}
        AND "occurredAt" < ${to}
        ${source ? Prisma.sql`AND "source" = ${source}` : Prisma.empty}
      ORDER BY "occurredAt" ASC
    `;
    return { success: true, count: events.length, events: events.map((event) => ({ id: String(event.id), loggedValue: Number(event.loggedValue), occurredAt: event.occurredAt, source: event.source, sourceId: event.sourceId })) };
  }

  async syncMetricEventForUser(userId: string, payload: { metricType: string; value?: number; [key: string]: any }) {
    const patient = await this.findPatientForUser(userId);
    if (!patient) throw new NotFoundException('Patient not found.');
    const metricType = String(payload?.metricType ?? '').trim().toUpperCase();
    const metricKey = String(payload?.metricKey ?? '').trim();
    const loggedValue = Number(payload?.loggedValue ?? payload?.value);
    const source = String(payload?.source ?? 'manual').trim();
    const sourceId = payload?.sourceId ? String(payload.sourceId).trim() : null;
    const occurredAt = payload?.occurredAt instanceof Date ? payload.occurredAt : payload?.occurredAt ? new Date(payload.occurredAt) : new Date();
    if (!metricType || !metricKey || !source || !Number.isFinite(loggedValue)) throw new BadRequestException('Metric event data is invalid.');
    if (Number.isNaN(occurredAt.getTime())) throw new BadRequestException('Metric event date is invalid.');
    const existing = sourceId ? await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patient.id} AND "source" = ${source} AND "sourceId" = ${sourceId}
      LIMIT 1
    ` : [];
    let eventId: string;
    if (existing.length) {
      eventId = String(existing[0].id);
      await this.prisma.$executeRaw`
        UPDATE "HealthGoalMetricEvent"
        SET "metricType" = ${metricType}, "metricKey" = ${metricKey}, "loggedValue" = ${loggedValue}, "occurredAt" = ${occurredAt}, "metadata" = ${payload?.metadata ? JSON.stringify(payload.metadata) : null}::jsonb
        WHERE "id" = ${eventId}::uuid
      `;
    } else {
      const inserted = await this.prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "HealthGoalMetricEvent" ("id", "patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId", "metadata")
        VALUES (gen_random_uuid(), ${patient.id}, ${metricType}, ${metricKey}, ${loggedValue}, ${occurredAt}, ${source}, ${sourceId}, ${payload?.metadata ? JSON.stringify(payload.metadata) : null}::jsonb)
        RETURNING "id"
      `;
      eventId = String(inserted[0].id);
    }
    const affectedGoals = await this.prisma.$queryRaw<Array<{ id: string; title: string; status: string }>>`
      SELECT DISTINCT hg."id", hg."title", hg."status"
      FROM "HealthGoal" hg
      INNER JOIN "HealthGoalMetricConfig" hgm ON hgm."healthGoalId" = hg."id"
      WHERE hg."patientId" = ${patient.id}
        AND UPPER(hg."status") IN ('ACTIVE', 'IN_PROGRESS')
        AND UPPER(hgm."metricType") = ${metricType}
        AND hgm."metricKey" = ${metricKey}
    `;
    return { success: true, eventId, affectedGoals };
  }

  async findPatientForUser(userId: string) { return this.prisma.patient.findUnique({ where: { userId } }); }
  private async assertPatientMedicationBelongsToPatient(patientMedicationId: string | undefined, patientId: string) {
    if (!patientMedicationId) return;
    const row = await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT pm."id" FROM "PatientMedication" pm INNER JOIN "HealthPassport" hp ON hp."id" = pm."healthPassportId" WHERE pm."id" = ${patientMedicationId} AND hp."patientId" = ${patientId} LIMIT 1`;
    if (!row.length) throw new BadRequestException('The selected medication does not belong to this patient.');
  }
  private async medicationGoalAssociations(goalIds: string[]): Promise<MedicationGoalAssociation[]> {
    if (!goalIds.length) return [];
    return this.prisma.$queryRaw<MedicationGoalAssociation[]>`SELECT hg."id" AS "healthGoalId", hg."patientMedicationId", pm."medicationId", m."name" AS "medicationName", pm."dosage", pm."frequency" FROM "HealthGoal" hg LEFT JOIN "PatientMedication" pm ON pm."id" = hg."patientMedicationId" LEFT JOIN "Medication" m ON m."id" = pm."medicationId" WHERE hg."id" IN (${Prisma.join(goalIds)})`;
  }
  private async attachMedicationGoalAssociations<T extends { id: string; category?: unknown; title?: unknown; description?: unknown; patientId?: string }>(goals: T[]) {
    const medicationGoals = goals.filter((goal) => String(goal?.category ?? '').toUpperCase() === 'MEDICATION');
    if (!medicationGoals.length) return goals;
    const associations = await this.medicationGoalAssociations(medicationGoals.map((goal) => goal.id));
    const byGoalId = new Map(associations.map((row) => [String(row.healthGoalId), row]));
    const patients = [...new Set(medicationGoals.map((goal) => goal.patientId).filter(Boolean))] as string[];
    const legacyMedicationRows = patients.length ? await this.prisma.$queryRaw<Array<{ patientId: string; patientMedicationId: string; medicationId: string; medicationName: string; dosage: string | null; frequency: string | null }>>`SELECT hp."patientId", pm."id" AS "patientMedicationId", pm."medicationId", m."name" AS "medicationName", pm."dosage", pm."frequency" FROM "PatientMedication" pm INNER JOIN "HealthPassport" hp ON hp."id" = pm."healthPassportId" INNER JOIN "Medication" m ON m."id" = pm."medicationId" WHERE hp."patientId" IN (${Prisma.join(patients)}) AND pm."status" = 'ACTIVE'` : [];
    const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return goals.map((goal) => {
      const direct = byGoalId.get(String(goal.id));
      if (direct?.patientMedicationId) return { ...goal, patientMedicationId: direct.patientMedicationId, medicationId: direct.medicationId, medication: { id: direct.medicationId, name: direct.medicationName }, medicationDosage: direct.dosage, medicationFrequency: direct.frequency };
      const title = normalise(goal.title); const description = normalise(goal.description);
      const candidates = legacyMedicationRows.filter((row) => { if (!goal.patientId || row.patientId !== goal.patientId) return false; const name = normalise(row.medicationName); return Boolean(name) && (title === name || title.includes(name) || description.includes(name)); });
      const uniqueMatch = candidates.length === 1 ? candidates[0] : null;
      if (!uniqueMatch) return goal;
      return { ...goal, patientMedicationId: uniqueMatch.patientMedicationId, medicationId: uniqueMatch.medicationId, medication: { id: uniqueMatch.medicationId, name: uniqueMatch.medicationName }, medicationDosage: uniqueMatch.dosage, medicationFrequency: uniqueMatch.frequency };
    });
  }
  private async ensureOnboardingWeightGoalMetric(goal: any) { return goal; }
  private async ensureOnboardingExerciseGoalMetric(goal: any) { return goal; }
  public async configureMetric(goalId: string, config: any) {
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "HealthGoalMetricConfig" WHERE "healthGoalId" = ${goalId} LIMIT 1`;
    if (existing.length) await this.prisma.$executeRaw`UPDATE "HealthGoalMetricConfig" SET "metricType" = ${config.metricType ?? null}, "metricKey" = ${config.metricKey ?? null}, "frequency" = ${config.frequency ?? null}, "frequencyTarget" = ${config.frequencyTarget ?? null}, "aggregation" = ${config.aggregation ?? null}, "comparison" = ${config.comparison ?? null}, "guidanceText" = ${config.guidanceText ?? null} WHERE "id" = ${existing[0].id}`;
    else await this.prisma.$executeRaw`INSERT INTO "HealthGoalMetricConfig" ("id", "healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "aggregation", "comparison", "guidanceText") VALUES (gen_random_uuid(), ${goalId}, ${config.metricType ?? null}, ${config.metricKey ?? null}, ${config.frequency ?? null}, ${config.aggregation ?? null}, ${config.comparison ?? null}, ${config.guidanceText ?? null})`;
  }
  async create(dto: CreateHealthGoalDto) {
    const { metricType, metricKey, frequency, frequencyTarget, aggregation, comparison, guidanceText, patientMedicationId, ...goalData } = dto;
    const isMedicationGoal = goalData.category === 'MEDICATION';
    if (patientMedicationId && !isMedicationGoal) throw new BadRequestException('A medication can only be attached to a medication goal.');
    await this.assertPatientMedicationBelongsToPatient(patientMedicationId, String(goalData.patientId));
    const targetValue = goalData.targetValue ?? (isMedicationGoal ? String(DEFAULT_MEDICATION_TARGET) : undefined); const unit = goalData.unit ?? (isMedicationGoal ? '%' : undefined);
    const goal = await this.prisma.healthGoal.create({ data: { ...goalData, ...(targetValue !== undefined ? { targetValue } : {}), ...(unit !== undefined ? { unit } : {}) }, include: { patient: true, practitioner: true, carePlan: true, progress: true } });
    if (patientMedicationId) await this.prisma.$executeRaw`UPDATE "HealthGoal" SET "patientMedicationId" = ${patientMedicationId} WHERE "id" = ${goal.id}`;
    await this.configureMetric(goal.id, { metricType, metricKey, frequency, frequencyTarget: frequencyTarget == null ? (isMedicationGoal ? DEFAULT_MEDICATION_TARGET : undefined) : Number(frequencyTarget), aggregation, comparison, guidanceText });
    return this.findOne(goal.id);
  }
  async findAll(query: QueryHealthGoalDto) {
    const { page, limit, patientId, practitionerId, carePlanId, category, priority, status } = query; const where: Prisma.HealthGoalWhereInput = { patientId, practitionerId, carePlanId, category, priority, status };
    const [data, total] = await this.prisma.$transaction([this.prisma.healthGoal.findMany({ where, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), this.prisma.healthGoal.count({ where })]);
    for (const goal of data) { await this.ensureOnboardingWeightGoalMetric(goal); await this.ensureOnboardingExerciseGoalMetric(goal); }
    const normalizedData = await Promise.all(data.map(async (goal: any) => { if (String(goal.category).toUpperCase() === 'MEDICATION' && goal.targetValue == null) return { ...goal, targetValue: new Prisma.Decimal(DEFAULT_MEDICATION_TARGET), unit: '%' }; const config = await this.prisma.$queryRaw<any[]>`SELECT * FROM "HealthGoalMetricConfig" WHERE "healthGoalId" = ${goal.id} LIMIT 1`; return { ...goal, metricConfig: config[0] ?? null }; }));
    const withMedicationAssociations = await this.attachMedicationGoalAssociations(normalizedData as any[]); return { data: withMedicationAssociations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async findOne(id: string) {
    const healthGoal = await this.prisma.healthGoal.findUnique({ where: { id }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } }); if (!healthGoal) throw new NotFoundException('Health goal not found.'); let result: any = healthGoal;
    if (String(healthGoal.category).toUpperCase() === 'MEDICATION' && healthGoal.targetValue == null) result = await this.prisma.healthGoal.update({ where: { id }, data: { targetValue: String(DEFAULT_MEDICATION_TARGET), unit: '%' }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } });
    const [hydrated] = await this.attachMedicationGoalAssociations([result] as any[]); return hydrated ?? result;
  }
  async update(id: string, dto: UpdateHealthGoalDto) {
    const existing = await this.findOne(id); const isMedicationGoal = String(existing.category).toUpperCase() === 'MEDICATION'; const { patientMedicationId, ...goalData } = dto;
    if (patientMedicationId && String(goalData.category ?? existing.category).toUpperCase() !== 'MEDICATION') throw new BadRequestException('A medication can only be attached to a medication goal.'); if (patientMedicationId) await this.assertPatientMedicationBelongsToPatient(patientMedicationId, String(existing.patientId));
    await this.prisma.healthGoal.update({ where: { id }, data: { ...goalData, ...(isMedicationGoal && goalData.targetValue == null ? { targetValue: String(DEFAULT_MEDICATION_TARGET) } : {}), ...(isMedicationGoal && goalData.unit == null ? { unit: '%' } : {}) }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } });
    if (patientMedicationId !== undefined) await this.prisma.$executeRaw`UPDATE "HealthGoal" SET "patientMedicationId" = ${patientMedicationId ?? null} WHERE "id" = ${id}`; return this.findOne(id);
  }
  async recordProgress(id: string, dto: RecordHealthGoalProgressDto) {
    const goal = await this.findOne(id); const currentValue = Number(dto.currentValue); const targetValue = goal.targetValue == null ? null : Number(goal.targetValue); const previousValue = goal.currentValue == null ? null : Number(goal.currentValue); if (!Number.isFinite(currentValue)) throw new BadRequestException('Health goal progress value is invalid.');
    const progressPercent = targetValue != null && targetValue > 0 ? Math.min(100, Math.max(0, (currentValue / targetValue) * 100)) : 0; const progressStatus: HealthGoalProgressStatus = targetValue != null && targetValue > 0 && currentValue >= targetValue ? HealthGoalProgressStatus.ACHIEVED : previousValue == null || currentValue > previousValue ? HealthGoalProgressStatus.IMPROVING : currentValue < previousValue ? HealthGoalProgressStatus.DECLINING : HealthGoalProgressStatus.STAGNANT;
    return this.prisma.$transaction(async (tx) => { await tx.healthGoal.update({ where: { id }, data: { currentValue: String(currentValue), status: progressStatus === HealthGoalProgressStatus.ACHIEVED ? 'ACHIEVED' : goal.status, achievedAt: progressStatus === HealthGoalProgressStatus.ACHIEVED ? new Date() : null } }); await tx.healthGoalProgress.create({ data: { healthGoalId: id, currentValue: String(currentValue), progressPercent: String(progressPercent.toFixed(2)), status: progressStatus, notes: dto.notes, measuredAt: new Date() } }); return tx.healthGoal.findUnique({ where: { id }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } }); });
  }
  async remove(id: string) { await this.findOne(id); await this.prisma.healthGoal.delete({ where: { id } }); return { message: 'Health goal deleted successfully.' }; }
}