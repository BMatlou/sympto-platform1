import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateCarePlanTaskDto } from './dto/create-care-plan-task.dto';
import { UpdateCarePlanTaskDto } from './dto/update-care-plan-task.dto';
import { QueryCarePlanTaskDto } from './dto/query-care-plan-task.dto';

@Injectable()
export class CarePlanTasksService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCarePlanTaskDto,
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

    if (dto.assignedToId) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.assignedToId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'Assigned user not found.',
        );
      }
    }

    return this.prisma.carePlanTask.create({
      data: {
        carePlanId: dto.carePlanId,
        assignedToId: dto.assignedToId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        completedAt: dto.completedAt,
        status: dto.status,
      },

      include: {
        carePlan: true,
        assignedTo: true,
      },
    });
  }

  async findAll(
    query: QueryCarePlanTaskDto,
  ) {
    const {
      page,
      limit,
      carePlanId,
      status,
      search,
    } = query;

    const where: Prisma.CarePlanTaskWhereInput =
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
        this.prisma.carePlanTask.findMany({
          where,

          include: {
            carePlan: true,
            assignedTo: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.carePlanTask.count({
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

  async findOne(id: string) {
    const task =
      await this.prisma.carePlanTask.findUnique({
        where: {
          id,
        },

        include: {
          carePlan: true,
          assignedTo: true,
        },
      });

    if (!task) {
      throw new NotFoundException(
        'Care plan task not found.',
      );
    }

    return task;
  }

  async update(
    id: string,
    dto: UpdateCarePlanTaskDto,
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

    if (dto.assignedToId) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.assignedToId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'Assigned user not found.',
        );
      }
    }

    return this.prisma.carePlanTask.update({
      where: {
        id,
      },

      data: {
        carePlanId: dto.carePlanId,
        assignedToId: dto.assignedToId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        completedAt: dto.completedAt,
        status: dto.status,
      },

      include: {
        carePlan: true,
        assignedTo: true,
      },
    });
  }


  async updateStatusForPatient(
    userId: string,
    taskId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    const task = await this.prisma.carePlanTask.findFirst({
      where: {
        id: taskId,
        carePlan: {
          patientId: patient.id,
        },
      },
      select: {
        id: true,
        status: true,
        carePlanId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Care plan task not found.');
    }

    if (task.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled care-plan tasks cannot be changed.');
    }

    if (status === 'PENDING' && task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED') {
      throw new BadRequestException('This task is not available to return to pending.');
    }

    const completedAt = status === 'COMPLETED' ? new Date() : null;

    return this.prisma.carePlanTask.update({
      where: { id: task.id },
      data: {
        status,
        completedAt,
      },
      include: {
        carePlan: true,
        assignedTo: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.carePlanTask.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Care plan task deleted successfully.',
    };
  }
}