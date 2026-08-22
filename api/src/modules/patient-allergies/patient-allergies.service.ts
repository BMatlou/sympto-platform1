import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePatientAllergyDto } from './dto/create-patient-allergy.dto';
import { UpdatePatientAllergyDto } from './dto/update-patient-allergy.dto';
import { QueryPatientAllergyDto } from './dto/query-patient-allergy.dto';
import { AllergySeverity } from '@prisma/client';


@Injectable()
export class PatientAllergiesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePatientAllergyDto,
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

    const allergy =
      await this.prisma.allergy.findUnique({
        where: {
          id: dto.allergyId,
        },
      });

    if (!allergy) {
      throw new NotFoundException(
        'Allergy not found.',
      );
    }

    const existing =
      await this.prisma.patientAllergy.findFirst({
        where: {
          healthPassportId: dto.healthPassportId,
          allergyId: dto.allergyId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'This allergy has already been added to the health passport.',
      );
    }

    return this.prisma.patientAllergy.create({
      data: {
        healthPassportId: dto.healthPassportId,
        allergyId: dto.allergyId,
        severity: dto.severity,
        reaction: dto.reaction?.trim(),
        onsetDate: dto.onsetDate
          ? new Date(dto.onsetDate)
          : undefined,
        verified: dto.verified ?? false,
        verifiedBy: dto.verifiedBy?.trim(),
        notes: dto.notes?.trim(),
      },

      include: {
        allergy: true,
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
    query: QueryPatientAllergyDto,
  ) {
    const {
      page,
      limit,
      healthPassportId,
      allergyId,
      active,
    } = query;

    const where: Prisma.PatientAllergyWhereInput = {
      ...(healthPassportId && {
        healthPassportId,
      }),

      ...(allergyId && {
        allergyId,
      }),

      ...(active !== undefined && {
        active,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.patientAllergy.findMany({
          where,

          include: {
            allergy: true,

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
            onsetDate: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.patientAllergy.count({
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
    const patientAllergy =
      await this.prisma.patientAllergy.findUnique({
        where: {
          id,
        },

        include: {
          allergy: true,

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

    if (!patientAllergy) {
      throw new NotFoundException(
        'Patient allergy not found.',
      );
    }

    return patientAllergy;
  }

  async update(
    id: string,
    dto: UpdatePatientAllergyDto,
  ) {
    const existing =
      await this.findOne(id);

    const healthPassportId =
      dto.healthPassportId ??
      existing.healthPassportId;

    const allergyId =
      dto.allergyId ??
      existing.allergyId;

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

    if (dto.allergyId) {
      const allergy =
        await this.prisma.allergy.findUnique({
          where: {
            id: dto.allergyId,
          },
        });

      if (!allergy) {
        throw new NotFoundException(
          'Allergy not found.',
        );
      }
    }

    const duplicate =
      await this.prisma.patientAllergy.findFirst({
        where: {
          id: {
            not: id,
          },
          healthPassportId,
          allergyId,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'This allergy has already been added to the health passport.',
      );
    }

    return this.prisma.patientAllergy.update({
      where: {
        id,
      },

      data: {
        healthPassportId,
        allergyId,
        severity: dto.severity,
        reaction: dto.reaction?.trim(),
        onsetDate: dto.onsetDate
          ? new Date(dto.onsetDate)
          : undefined,
        verified: dto.verified ?? false,
        verifiedBy: dto.verifiedBy?.trim(),
        notes: dto.notes?.trim(),
      },

      include: {
        allergy: true,

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

    await this.prisma.patientAllergy.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Patient allergy deleted successfully.',
    };
  }
}