import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateHealthGoalDto } from './dto/create-health-goal.dto';
import { UpdateHealthGoalDto } from './dto/update-health-goal.dto';
import { QueryHealthGoalDto } from './dto/query-health-goal.dto';

@Injectable()
export class HealthGoalsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateHealthGoalDto,
  ) {
    return this.prisma.healthGoal.create({
      data: {
        ...dto,
      },

      include: {
        patient: true,
        practitioner: true,
        carePlan: true,
        progress: true,
      },
    });
  }

  async findAll(
    query: QueryHealthGoalDto,
  ) {
    const {
      page,
      limit,
      patientId,
      practitionerId,
      carePlanId,
      category,
      priority,
      status,
    } = query;

    const where: Prisma.HealthGoalWhereInput =
      {
        patientId,
        practitionerId,
        carePlanId,
        category,
        priority,
        status,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.healthGoal.findMany({
          where,

          include: {
            patient: true,
            practitioner: true,
            carePlan: true,
            progress: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.healthGoal.count({
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
    const healthGoal =
      await this.prisma.healthGoal.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          practitioner: true,
          carePlan: true,
          progress: true,
        },
      });

    if (!healthGoal) {
      throw new NotFoundException(
        'Health goal not found.',
      );
    }

    return healthGoal;
  }

  async update(
    id: string,
    dto: UpdateHealthGoalDto,
  ) {
    await this.findOne(id);

    return this.prisma.healthGoal.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        patient: true,
        practitioner: true,
        carePlan: true,
        progress: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.healthGoal.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Health goal deleted successfully.',
    };
  }
}