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

  async create(
    dto: CreateHealthGoalProgressDto,
  ) {
    return this.prisma.healthGoalProgress.create({
      data: {
        ...dto,
      },

      include: {
        healthGoal: true,
      },
    });
  }

  async findAll(
    query: QueryHealthGoalProgressDto,
  ) {
    const {
      page,
      limit,
      healthGoalId,
      status,
    } = query;

    const where: Prisma.HealthGoalProgressWhereInput =
      {
        healthGoalId,
        status,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.healthGoalProgress.findMany({
          where,

          include: {
            healthGoal: true,
          },

          orderBy: {
            measuredAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.healthGoalProgress.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit,
        ),
      },
    };
  }

  async findOne(
    id: string,
  ) {
    const progress =
      await this.prisma.healthGoalProgress.findUnique({
        where: {
          id,
        },

        include: {
          healthGoal: true,
        },
      });

    if (!progress) {
      throw new NotFoundException(
        'Health goal progress not found.',
      );
    }

    return progress;
  }

  async update(
    id: string,
    dto: UpdateHealthGoalProgressDto,
  ) {
    await this.findOne(id);

    return this.prisma.healthGoalProgress.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        healthGoal: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.healthGoalProgress.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Health goal progress deleted successfully.',
    };
  }
}