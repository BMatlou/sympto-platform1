import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePatientImmunizationDto } from './dto/create-patient-immunization.dto';
import { UpdatePatientImmunizationDto } from './dto/update-patient-immunization.dto';
import { QueryPatientImmunizationDto } from './dto/query-patient-immunization.dto';

@Injectable()
export class PatientImmunizationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePatientImmunizationDto,
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

    const immunization =
      await this.prisma.immunization.findUnique({
        where: {
          id: dto.immunizationId,
        },
      });

    if (!immunization) {
      throw new NotFoundException(
        'Immunization not found.',
      );
    }

    const doseNumber =
      dto.doseNumber ?? 1;

    const existing =
      await this.prisma.patientImmunization.findFirst({
        where: {
          healthPassportId: dto.healthPassportId,
          immunizationId: dto.immunizationId,
          doseNumber,
        },
      });

    if (existing) {
      throw new ConflictException(
        'This immunization dose has already been recorded for the health passport.',
      );
    }

    return this.prisma.patientImmunization.create({
      data: {
        healthPassportId: dto.healthPassportId,
        immunizationId: dto.immunizationId,
        administeredAt: dto.administeredAt
          ? new Date(dto.administeredAt)
          : undefined,
        doseNumber,
        batchNumber: dto.batchNumber?.trim(),
        administeredBy: dto.administeredBy?.trim(),
        facility: dto.facility?.trim(),
        notes: dto.notes?.trim(),
      },

      include: {
        immunization: true,

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
    query: QueryPatientImmunizationDto,
  ) {
    const {
      page,
      limit,
      healthPassportId,
      immunizationId,
    } = query;

    const where: Prisma.PatientImmunizationWhereInput = {
      ...(healthPassportId && {
        healthPassportId,
      }),

      ...(immunizationId && {
        immunizationId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.patientImmunization.findMany({
          where,

          include: {
            immunization: true,

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

          orderBy: [
            {
              administeredAt: 'desc',
            },
            {
              doseNumber: 'asc',
            },
          ],

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.patientImmunization.count({
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
    const patientImmunization =
      await this.prisma.patientImmunization.findUnique({
        where: {
          id,
        },

        include: {
          immunization: true,

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

    if (!patientImmunization) {
      throw new NotFoundException(
        'Patient immunization not found.',
      );
    }

    return patientImmunization;
  }

  async update(
    id: string,
    dto: UpdatePatientImmunizationDto,
  ) {
    const existing =
      await this.findOne(id);

    const healthPassportId =
      dto.healthPassportId ??
      existing.healthPassportId;

    const immunizationId =
      dto.immunizationId ??
      existing.immunizationId;

    const doseNumber =
      dto.doseNumber ??
      existing.doseNumber;

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

    if (dto.immunizationId) {
      const immunization =
        await this.prisma.immunization.findUnique({
          where: {
            id: dto.immunizationId,
          },
        });

      if (!immunization) {
        throw new NotFoundException(
          'Immunization not found.',
        );
      }
    }

    const duplicate =
      await this.prisma.patientImmunization.findFirst({
        where: {
          id: {
            not: id,
          },
          healthPassportId,
          immunizationId,
          doseNumber,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'This immunization dose has already been recorded for the health passport.',
      );
    }

    return this.prisma.patientImmunization.update({
      where: {
        id,
      },

      data: {
        healthPassportId,
        immunizationId,
        administeredAt: dto.administeredAt
          ? new Date(dto.administeredAt)
          : undefined,
        doseNumber,
        batchNumber: dto.batchNumber?.trim(),
        administeredBy: dto.administeredBy?.trim(),
        facility: dto.facility?.trim(),
        notes: dto.notes?.trim(),
      },

      include: {
        immunization: true,

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

    await this.prisma.patientImmunization.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Patient immunization deleted successfully.',
    };
  }
}