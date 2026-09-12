import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HealthGoalCategory,
  HealthGoalProgressStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from './goals-engine.service';
import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';
import { RecordHealthGoalProgressDto } from './dto/record-health-goal-progress.dto';

@Injectable()
export class HealthGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsEngine: GoalsEngineService,
  ) {}

  async create(dto: CreateHealthGoalDto) {
    const goal = await this.prisma.healthGoal.create({
      data: { ...dto },
      include: { patient: true, practitioner: true, carePlan: true, progress: true },
    });

    const defaults = this.metricDefaults(goal.category);
    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricConfig"
        ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget")
      VALUES
        (${goal.id}, ${defaults.metricType}, ${defaults.metricKey}, 'DAILY', ${goal.targetValue ?? null})
      ON CONFLICT ("healthGoalId") DO NOTHING
    `;

    await this.goalsEngine.backfillJournalMetrics(goal.patientId);
    if (defaults.metricType) {
      await this.goalsEngine.recomputeMatchingGoals(
        goal.patientId,
        defaults.metricType,
        defaults.metricKey,
      );
    }

    return this.findOne(goal.id);
  }

  async configureMetric(id: string, config: {
    metricType?: string;
    metricKey?: string;
    frequency?: 'DAILY' | 'WEEKLY' | 'TOTAL';
    frequencyTarget?: number | null;
    guidanceText?: string | null;
  }) {
    const goal = await this.findOne(id);
    const defaults = this.metricDefaults(goal.category);
    const metricType = config.metricType ?? defaults.metricType;
    const metricKey = config.metricKey ?? defaults.metricKey;
    const frequency = config.frequency ?? 'DAILY';
    const frequencyTarget = config.frequencyTarget ?? Number(goal.targetValue ?? 0);

    await this.prisma.$executeRaw`
      INSERT INTO "HealthGoalMetricConfig"
        ("healthGoalId", "metricType", "metricKey", "frequency", "frequencyTarget", "guidanceText")
      VALUES
        (${id}, ${metricType}, ${metricKey}, ${frequency}, ${frequencyTarget || null}, ${config.guidanceText ?? null})
      ON CONFLICT ("healthGoalId") DO UPDATE SET
        "metricType" = EXCLUDED."metricType",
        "metricKey" = EXCLUDED."metricKey",
        "frequency" = EXCLUDED."frequency",
        "frequencyTarget" = EXCLUDED."frequencyTarget",
        "guidanceText" = EXCLUDED."guidanceText",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    await this.goalsEngine.backfillJournalMetrics(goal.patientId);
    return this.findOne(id);
  }

  async getActiveSnapshot(patientId: string) {
    return this.goalsEngine.snapshot(patientId);
  }

  async findAll(query: QueryHealthGoalDto) {
    const { page, limit, patientId, practitionerId, carePlanId, category, priority, status } = query;
    const where: Prisma.HealthGoalWhereInput = { patientId, practitionerId, carePlanId, category, priority, status };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.healthGoal.findMany({
        where,
        include: {
          patient: true,
          practitioner: true,
          carePlan: true,
          progress: { orderBy: { measuredAt: 'desc' } },
        },
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
      include: {
        patient: true,
        practitioner: true,
        carePlan: true,
        progress: { orderBy: { measuredAt: 'desc' } },
      },
    });
    if (!healthGoal) throw new NotFoundException('Health goal not found.');
    return healthGoal;
  }

  async update(id: string, dto: UpdateHealthGoalDto) {
    await this.findOne(id);
    return this.prisma.healthGoal.update({
      where: { id },
      data: { ...dto },
      include: {
        patient: true,
        practitioner: true,
        carePlan: true,
        progress: { orderBy: { measuredAt: 'desc' } },
      },
    });
  }

  async syncMetricEventForUser(userId: string, input: {
    metricType: string;
    metricKey: string;
    loggedValue: number;
    occurredAt?: Date;
    source?: string;
    sourceId?: string;
  }) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found.');
    return this.goalsEngine.recordMetricEvent({ patientId: patient.id, ...input });
  }

  async recordProgress(id: string, dto: RecordHealthGoalProgressDto) {
    const goal = await this.findOne(id);
    let currentValue = Number(dto.currentValue);
    const targetValue = goal.targetValue == null ? null : Number(goal.targetValue);
    const previousValue = goal.currentValue == null ? null : Number(goal.currentValue);

    if (!Number.isFinite(currentValue)) {
      throw new BadRequestException('Health goal progress value is invalid.');
    }

    const supportedGoal =
      goal.category === HealthGoalCategory.HYDRATION ||
      goal.category === HealthGoalCategory.EXERCISE ||
      goal.category === HealthGoalCategory.SLEEP ||
      goal.category === HealthGoalCategory.MEDICATION;

    if (!supportedGoal) {
      throw new BadRequestException('This goal type is not updated by automatic activity tracking.');
    }

    const unit = String(goal.unit ?? '').trim().toLowerCase();
    if (goal.category === HealthGoalCategory.HYDRATION && ['l', 'liter', 'litre', 'liters', 'litres'].includes(unit)) currentValue /= 1000;
    if (goal.category === HealthGoalCategory.EXERCISE && ['h', 'hr', 'hour', 'hours'].includes(unit)) currentValue /= 60;
    if (goal.category === HealthGoalCategory.SLEEP && ['min', 'minute', 'minutes'].includes(unit)) currentValue *= 60;

    const progressPercent = targetValue != null && targetValue > 0
      ? Math.min(100, Math.max(0, (currentValue / targetValue) * 100))
      : 0;

    let progressStatus: HealthGoalProgressStatus = HealthGoalProgressStatus.STAGNANT;
    if (targetValue != null && targetValue > 0 && currentValue >= targetValue) progressStatus = HealthGoalProgressStatus.ACHIEVED;
    else if (previousValue == null || currentValue > previousValue) progressStatus = HealthGoalProgressStatus.IMPROVING;
    else if (currentValue < previousValue) progressStatus = HealthGoalProgressStatus.DECLINING;

    const updatedStatus = progressStatus === HealthGoalProgressStatus.ACHIEVED ? 'ACHIEVED' : goal.status === 'ACHIEVED' ? 'ACTIVE' : goal.status;

    return this.prisma.$transaction(async (tx) => {
      await tx.healthGoal.update({
        where: { id },
        data: {
          currentValue: String(currentValue),
          status: updatedStatus,
          ...(progressStatus === HealthGoalProgressStatus.ACHIEVED ? { achievedAt: new Date() } : { achievedAt: null }),
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
        include: { patient: true, practitioner: true, carePlan: true, progress: { orderBy: { measuredAt: 'desc' } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.healthGoal.delete({ where: { id } });
    return { message: 'Health goal deleted successfully.' };
  }

  private metricDefaults(category: HealthGoalCategory) {
    switch (category) {
      case HealthGoalCategory.EXERCISE:
        return { metricType: 'EXERCISE', metricKey: 'exercise.minutes' };
      case HealthGoalCategory.HYDRATION:
        return { metricType: 'HYDRATION', metricKey: 'hydration.ml' };
      case HealthGoalCategory.SLEEP:
        return { metricType: 'SLEEP', metricKey: 'sleep.hours' };
      case HealthGoalCategory.MEDICATION:
        return { metricType: 'MEDICATION', metricKey: 'medication.adherence' };
      default:
        return { metricType: 'OTHER', metricKey: category.toLowerCase() };
    }
  }
}
