import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HealthGoalProgressStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from './goals-engine-v3.service';
import { goalRuleFor } from './goal-metric-rules';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { RecordHealthGoalProgressDto } from './dto/record-health-goal-progress.dto';

@Injectable()
export class HealthGoalsService {
  constructor(private readonly prisma: PrismaService, private readonly goalsEngine: GoalsEngineService) {}

  async create(dto: CreateHealthGoalDto) {
    const { metricType, metricKey, frequency, frequencyTarget, aggregation, comparison, guidanceText, ...goalData } = dto;
    const goal = await this.prisma.healthGoal.create({
      data: { ...goalData },
      include: { patient: true, practitioner: true, carePlan: true, progress: true },
    });

    await this.configureMetric(goal.id, {
      metricType,
      metricKey,
      frequency,
      frequencyTarget: frequencyTarget == null ? undefined : Number(frequencyTarget),
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
    const resolvedMetricType = config.metricType ?? defaults.metricType;
    const resolvedMetricKey = config.metricKey ?? defaults.metricKey;
    const resolvedFrequency = config.frequency ?? defaults.frequency;
    const resolvedTarget = config.frequencyTarget ?? Number(goal.targetValue ?? 0);
    const resolvedAggregation = config.aggregation ?? defaults.aggregation;
    const resolvedComparison = config.comparison ?? defaults.comparison;

    if (!(resolvedTarget > 0)) throw new BadRequestException('A positive target is required for an automatic goal.');

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
    const rows = await this.prisma.$queryRaw<Array<{ id: string; loggedValue: Prisma.Decimal; occurredAt: Date; source: string; sourceId: string | null }>>`
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
    return {
      count: rows.length,
      events: rows.map((row) => ({
        id: row.id,
        loggedValue: Number(row.loggedValue),
        occurredAt: row.occurredAt,
        source: row.source,
        sourceId: row.sourceId,
      })),
    };
  }

  async findAll(query: QueryHealthGoalDto) {
    const { page, limit, patientId, practitionerId, carePlanId, category, priority, status } = query;
    const where: Prisma.HealthGoalWhereInput = { patientId, practitionerId, carePlanId, category, priority, status };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.healthGoal.findMany({ where, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.healthGoal.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const healthGoal = await this.prisma.healthGoal.findUnique({ where: { id }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } });
    if (!healthGoal) throw new NotFoundException('Health goal not found.');
    return healthGoal;
  }

  async update(id: string, dto: UpdateHealthGoalDto) {
    await this.findOne(id);
    return this.prisma.healthGoal.update({ where: { id }, data: { ...dto }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } });
  }

  async recordProgress(id: string, dto: RecordHealthGoalProgressDto) {
    const goal = await this.findOne(id);
    const currentValue = Number(dto.currentValue);
    const targetValue = goal.targetValue == null ? null : Number(goal.targetValue);
    const previousValue = goal.currentValue == null ? null : Number(goal.currentValue);
    if (!Number.isFinite(currentValue)) throw new BadRequestException('Health goal progress value is invalid.');
    const progressPercent = targetValue != null && targetValue > 0 ? Math.min(100, Math.max(0, (currentValue / targetValue) * 100)) : 0;
    const progressStatus: HealthGoalProgressStatus = targetValue != null && targetValue > 0 && currentValue >= targetValue
      ? HealthGoalProgressStatus.ACHIEVED
      : previousValue == null || currentValue > previousValue ? HealthGoalProgressStatus.IMPROVING : currentValue < previousValue ? HealthGoalProgressStatus.DECLINING : HealthGoalProgressStatus.STAGNANT;
    return this.prisma.$transaction(async (tx) => {
      await tx.healthGoal.update({ where: { id }, data: { currentValue: String(currentValue), status: progressStatus === HealthGoalProgressStatus.ACHIEVED ? 'ACHIEVED' : goal.status, achievedAt: progressStatus === HealthGoalProgressStatus.ACHIEVED ? new Date() : null } });
      await tx.healthGoalProgress.create({ data: { healthGoalId: id, currentValue: String(currentValue), progressPercent: String(progressPercent.toFixed(2)), status: progressStatus, notes: dto.notes, measuredAt: new Date() } });
      return tx.healthGoal.findUnique({ where: { id }, include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } } });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.healthGoal.delete({ where: { id } });
    return { message: 'Health goal deleted successfully.' };
  }
}
