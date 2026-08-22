import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePatientConditionDto } from './dto/create-patient-condition.dto';
import { UpdatePatientConditionDto } from './dto/update-patient-condition.dto';
import { QueryPatientConditionDto } from './dto/query-patient-condition.dto';
import { ConditionStatus } from '@prisma/client';

@Injectable()
export class PatientConditionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePatientConditionDto,
  ) {
    const healthPassport =
      await this.prisma.healthPassport.findUnique({
        where: {
          id: dto.healthPassportId,
        },
      });

    if (!healthPassport) {
      throw new NotFoundException(
        'Health passport not found.',
      );
    }

    const condition =
      await this.prisma.condition.findUnique({
        where: {
          id: dto.conditionId,
        },
      });

    if (!condition) {
      throw new NotFoundException(
        'Condition not found.',
      );
    }

    const existing =
      await this.prisma.patientCondition.findFirst({
        where: {
          healthPassportId: dto.healthPassportId,
          conditionId: dto.conditionId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'This condition has already been added to the health passport.',
      );
    }

    return this.prisma.patientCondition.create({
      data: {
        healthPassportId: dto.healthPassportId,
        conditionId: dto.conditionId,
        diagnosedAt: dto.diagnosedAt
          ? new Date(dto.diagnosedAt)
          : undefined,
        resolvedAt: dto.resolvedAt
          ? new Date(dto.resolvedAt)
          : undefined,
        chronic: dto.chronic ?? false,
        status: dto.status ?? ConditionStatus.ACTIVE,
        notes: dto.notes?.trim(),
      },

      include: {
        condition: true,
        healthPassport: {
          include: {
            patient: {
              include: {
                person: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(
    query: QueryPatientConditionDto,
  ) {
    const {
      page,
      limit,
      healthPassportId,
      conditionId,
      status,
      chronic,
    } = query;

    const where: Prisma.PatientConditionWhereInput = {
      ...(healthPassportId && {
        healthPassportId,
      }),

      ...(conditionId && {
        conditionId,
      }),

      ...(status !== undefined && {
        status,
      }),

      ...(chronic !== undefined && {
        chronic,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.patientCondition.findMany({
          where,

          include: {
            condition: true,

            healthPassport: {
              include: {
                patient: {
                  include: {
                    person: true,
                  },
                },
              },
            },
          },

          orderBy: {
            diagnosedAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.patientCondition.count({
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
    const patientCondition =
      await this.prisma.patientCondition.findUnique({
        where: {
          id,
        },

        include: {
          condition: true,

          healthPassport: {
            include: {
              patient: {
                include: {
                  person: true,
                },
              },
            },
          },
        },
      });

    if (!patientCondition) {
      throw new NotFoundException(
        'Patient condition not found.',
      );
    }

    return patientCondition;
  }

  async update(
    id: string,
    dto: UpdatePatientConditionDto,
  ) {
    const existing =
      await this.findOne(id);

    const healthPassportId =
      dto.healthPassportId ??
      existing.healthPassportId;

    const conditionId =
      dto.conditionId ??
      existing.conditionId;

    if (dto.healthPassportId) {
      const passport =
        await this.prisma.healthPassport.findUnique({
          where: {
            id: dto.healthPassportId,
          },
        });

      if (!passport) {
        throw new NotFoundException(
          'Health passport not found.',
        );
      }
    }

    if (dto.conditionId) {
      const condition =
        await this.prisma.condition.findUnique({
          where: {
            id: dto.conditionId,
          },
        });

      if (!condition) {
        throw new NotFoundException(
          'Condition not found.',
        );
      }
    }

    const duplicate =
      await this.prisma.patientCondition.findFirst({
        where: {
          id: {
            not: id,
          },
          healthPassportId,
          conditionId,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'This condition has already been added to the health passport.',
      );
    }

    return this.prisma.patientCondition.update({
      where: {
        id,
      },

      data: {
        healthPassportId,
        conditionId,
        diagnosedAt: dto.diagnosedAt
          ? new Date(dto.diagnosedAt)
          : undefined,
        resolvedAt: dto.resolvedAt
          ? new Date(dto.resolvedAt)
          : undefined,
        chronic: dto.chronic,
        status: dto.status,
        notes: dto.notes?.trim(),
      },

      include: {
        condition: true,

        healthPassport: {
          include: {
            patient: {
              include: {
                person: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.patientCondition.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Patient condition deleted successfully.',
    };
  }
}