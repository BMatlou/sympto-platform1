import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { GoalsEngineService } from './goals-engine.service';

@Injectable()
export class HealthGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsEngine: GoalsEngineService,
  ) {}

  private async getPatientIdForUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patient) throw new NotFoundException('Patient not found.');
    return patient.id;
  }

  async create(dto: CreateHealthGoalDto) {
    const healthGoal = await this.prisma.healthGoal.create({
      data: {
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        carePlanId: dto.carePlanId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        status: dto.status,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue,
        unit: dto.unit,
        targetDate: dto.targetDate,
        achievedAt: dto.achievedAt,
      },
      include: { patient: true, practitioner: true, carePlan: true, progress: true },
    });

    if (dto.metricType && dto.metricKey) {
      await this.prisma.$executeRaw`
        INSERT INTO "HealthGoalMetricConfig"
          ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "guidanceText")
        VALUES
          (${healthGoal.id}, ${dto.metricType}, ${dto.metricKey}, ${dto.frequency ?? 'TOTAL'}, ${dto.frequencyTarget ?? null}, ${dto.guidanceText ?? null})
      `;
    }

    await this.goalsEngine.backfillPatientJournalEvents(dto.patientId);
    return healthGoal;
  }

  async getActiveSnapshot(patientId: string) {
    return this.goalsEngine.getActiveSnapshot(patientId);
  }

  async getActiveSnapshotForUser(userId: string) {
    return this.goalsEngine.getActiveSnapshot(await this.getPatientIdForUser(userId));
  }

  async syncMetricEventForUser(userId: string, input: {
    metricType: string;
    metricKey: string;
    loggedValue: number;
    occurredAt?: string;
    source?: string;
    sourceId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const patientId = await this.getPatientIdForUser(userId);
    return this.goalsEngine.recordMetricEvent({
      patientId,
      metricType: input.metricType,
      metricKey: input.metricKey,
      loggedValue: input.loggedValue,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
      source: input.source ?? 'frontend',
      sourceId: input.sourceId,
      metadata: input.metadata,
    });
  }

  async findAll(query: QueryHealthGoalDto) {
    const { page, limit, patientId, practitionerId, carePlanId, category, priority, status } = query;
    const where: Prisma.HealthGoalWhereInput = { patientId, practitionerId, carePlanId, category, priority, status };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.healthGoal.findMany({
        where,
        include: { patient: true, practitioner: true, carePlan: true, progress: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.healthGoal.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const healthGoal = await this.prisma.healthGoal.findUnique({
      where: { id },
      include: { patient: true, practitioner: true, carePlan: true, progress: true },
    });
    if (!healthGoal) throw new NotFoundException('Health goal not found.');
    return healthGoal;
  }

  async update(id: string, dto: UpdateHealthGoalDto) {
    await this.findOne(id);
    const healthGoal = await this.prisma.healthGoal.update({
      where: { id },
      data: {
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        carePlanId: dto.carePlanId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        status: dto.status,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue,
        unit: dto.unit,
        targetDate: dto.targetDate,
        achievedAt: dto.achievedAt,
      },
      include: { patient: true, practitioner: true, carePlan: true, progress: true },
    });

    if (dto.metricType && dto.metricKey) {
      await this.prisma.$executeRaw`
        INSERT INTO "HealthGoalMetricConfig"
          ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "guidanceText")
        VALUES
          (${id}, ${dto.metricType}, ${dto.metricKey}, ${dto.frequency ?? 'TOTAL'}, ${dto.frequencyTarget ?? null}, ${dto.guidanceText ?? null})
        ON CONFLICT ("healthGoalId") DO UPDATE SET
          "metricType" = EXCLUDED."metricType",
          "metricKey" = EXCLUDED."metricKey",
          "frequency" = EXCLUDED."frequency",
          "frequencyTarget" = EXCLUDED."frequencyTarget",
          "guidanceText" = EXCLUDED."guidanceText",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
    }

    return healthGoal;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.healthGoal.delete({ where: { id } });
    return { message: 'Health goal deleted successfully.' };
  }
}
