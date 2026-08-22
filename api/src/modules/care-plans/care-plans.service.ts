import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateCarePlanDto } from './dto/create-care-plan.dto';
import { UpdateCarePlanDto } from './dto/update-care-plan.dto';
import { QueryCarePlanDto } from './dto/query-care-plan.dto';

@Injectable()
export class CarePlansService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCarePlanDto,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    const practitioner =
      await this.prisma.practitioner.findUnique({
        where: {
          id: dto.practitionerId,
        },
      });

    if (!practitioner) {
      throw new NotFoundException(
        'Practitioner not found.',
      );
    }

    if (dto.encounterId) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    return this.prisma.carePlan.create({
      data: {
        patientId: dto.patientId,
        practitionerId:
          dto.practitionerId,
        encounterId:
          dto.encounterId,
        title: dto.title,
        description:
          dto.description,
        status: dto.status,
        startDate:
          dto.startDate,
        endDate: dto.endDate,
      },

      include: {
        patient: true,
        practitioner: true,
        encounter: true,
        goals: true,
        notes: true,
        tasks: true,
      },
    });
  }

  async findAll(
    query: QueryCarePlanDto,
  ) {
    const {
      page,
      limit,
      patientId,
      status,
      search,
    } = query;

    const where: Prisma.CarePlanWhereInput =
      {
        ...(patientId && {
          patientId,
        }),

        ...(status && {
          status,
        }),

        ...(search && {
          title: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.carePlan.findMany({
          where,

          include: {
            patient: true,
            practitioner: true,
            encounter: true,
            goals: true,
            notes: true,
            tasks: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.carePlan.count({
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
    const carePlan =
      await this.prisma.carePlan.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          practitioner: true,
          encounter: true,
          goals: true,
          notes: true,
          tasks: true,
        },
      });

    if (!carePlan) {
      throw new NotFoundException(
        'Care plan not found.',
      );
    }

    return carePlan;
  }

  async update(
    id: string,
    dto: UpdateCarePlanDto,
  ) {
    await this.findOne(id);

    if (dto.patientId) {
      const patient =
        await this.prisma.patient.findUnique({
          where: {
            id: dto.patientId,
          },
        });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }
    }

    if (dto.practitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.practitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    if (dto.encounterId) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    return this.prisma.carePlan.update({
      where: {
        id,
      },

      data: {
        patientId:
          dto.patientId,
        practitionerId:
          dto.practitionerId,
        encounterId:
          dto.encounterId,
        title: dto.title,
        description:
          dto.description,
        status: dto.status,
        startDate:
          dto.startDate,
        endDate:
          dto.endDate,
      },

      include: {
        patient: true,
        practitioner: true,
        encounter: true,
        goals: true,
        notes: true,
        tasks: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.carePlan.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Care plan deleted successfully.',
    };
  }
}