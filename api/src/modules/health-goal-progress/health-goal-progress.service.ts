import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateHealthGoalProgressDto } from './dto/create-health-goal-progress.dto';
import { UpdateHealthGoalProgressDto } from './dto/update-health-goal-progress.dto';
import { QueryHealthGoalProgressDto } from './dto/query-health-goal-progress.dto';

@Injectable()
export class HealthGoalProgressService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateHealthGoalProgressDto) {
    const goal = await this.prisma.healthGoal.findUnique({
      where: { id: dto.healthGoalId },
    });

    if (!goal) {
      throw new NotFoundException('Health goal not found.');
    }

    const currentValue = dto.currentValue ?? goal.currentValue?.toString();
    const targetValue = goal.targetValue?.toString();

    let progressPercent = dto.progressPercent;

    if (
      progressPercent === undefined &&
      currentValue !== undefined &&
      targetValue !== undefined
    ) {
      const current = Number(currentValue);
      const target = Number(targetValue);

      if (Number.isFinite(current) && Number.isFinite(target) && target > 0) {
        progressPercent = String(
          Math.min(100, Math.max(0, (current / target) * 100)),
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const progress = await tx.healthGoalProgress.create({
        data: {
          healthGoalId: dto.healthGoalId,
          currentValue,
          progressPercent,
          status: dto.status,
          notes: dto.notes,
          measuredAt: new Date(dto.measuredAt),
        },
        include: {
          healthGoal: true,
        },
      });

      await tx.healthGoal.update({
        where: { id: dto.healthGoalId },
        data: {
          ...(currentValue !== undefined && { currentValue }),
        },
      });

      return progress;
    });
  }

  async findAll(query: QueryHealthGoalProgressDto) {
    const { page, limit, healthGoalId, status } = query;

    const where: Prisma.HealthGoalProgressWhereInput = {
      healthGoalId,
      status,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.healthGoalProgress.findMany({
        where,
        include: { healthGoal: true },
        orderBy: { measuredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.healthGoalProgress.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const progress = await this.prisma.healthGoalProgress.findUnique({
      where: { id },
      include: { healthGoal: true },
    });

    if (!progress) {
      throw new NotFoundException('Health goal progress not found.');
    }

    return progress;
  }

  async update(id: string, dto: UpdateHealthGoalProgressDto) {
    const existing = await this.findOne(id);

    const progress = await this.prisma.healthGoalProgress.update({
      where: { id },
      data: { ...dto },
      include: { healthGoal: true },
    });

    if (dto.currentValue !== undefined) {
      await this.prisma.healthGoal.update({
        where: { id: existing.healthGoalId },
        data: { currentValue: dto.currentValue },
      });
    }

    return progress;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.healthGoalProgress.delete({
      where: { id },
    });

    return {
      message: 'Health goal progress deleted successfully.',
    };
  }
}
