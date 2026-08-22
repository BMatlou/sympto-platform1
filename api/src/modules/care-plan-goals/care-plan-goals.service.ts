import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateCarePlanGoalDto } from './dto/create-care-plan-goal.dto';
import { UpdateCarePlanGoalDto } from './dto/update-care-plan-goal.dto';
import { QueryCarePlanGoalDto } from './dto/query-care-plan-goal.dto';

@Injectable()
export class CarePlanGoalsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCarePlanGoalDto,
  ) {
    const carePlan =
      await this.prisma.carePlan.findUnique({
        where: {
          id: dto.carePlanId,
        },
      });

    if (!carePlan) {
      throw new NotFoundException(
        'Care plan not found.',
      );
    }

    return this.prisma.carePlanGoal.create({
      data: {
        carePlanId: dto.carePlanId,
        title: dto.title,
        description: dto.description,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue,
        dueDate: dto.dueDate,
        status: dto.status,
      },

      include: {
        carePlan: true,
      },
    });
  }

  async findAll(
    query: QueryCarePlanGoalDto,
  ) {
    const {
      page,
      limit,
      carePlanId,
      status,
      search,
    } = query;

    const where: Prisma.CarePlanGoalWhereInput =
      {
        ...(carePlanId && {
          carePlanId,
        }),

        ...(status && {
          status,
        }),

        ...(search && {
          title: {
            contains: search,
            mode:
              Prisma.QueryMode.insensitive,
          },
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.carePlanGoal.findMany({
          where,

          include: {
            carePlan: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.carePlanGoal.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit,
          ),
      },
    };
  }

  async findOne(id: string) {
    const goal =
      await this.prisma.carePlanGoal.findUnique({
        where: {
          id,
        },

        include: {
          carePlan: true,
        },
      });

    if (!goal) {
      throw new NotFoundException(
        'Care plan goal not found.',
      );
    }

    return goal;
  }

  async update(
    id: string,
    dto: UpdateCarePlanGoalDto,
  ) {
    await this.findOne(id);

    if (dto.carePlanId) {
      const carePlan =
        await this.prisma.carePlan.findUnique({
          where: {
            id: dto.carePlanId,
          },
        });

      if (!carePlan) {
        throw new NotFoundException(
          'Care plan not found.',
        );
      }
    }

    return this.prisma.carePlanGoal.update({
      where: {
        id,
      },

      data: {
        carePlanId: dto.carePlanId,
        title: dto.title,
        description: dto.description,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue,
        dueDate: dto.dueDate,
        status: dto.status,
      },

      include: {
        carePlan: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.carePlanGoal.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Care plan goal deleted successfully.',
    };
  }
}