import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateHealthPassportDto } from './dto/create-health-passport.dto';
import { UpdateHealthPassportDto } from './dto/update-health-passport.dto';
import { QueryHealthPassportDto } from './dto/query-health-passport.dto';

@Injectable()
export class HealthPassportsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateHealthPassportDto,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: {
        id: dto.patientId,
      },
    });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    const existing =
      await this.prisma.healthPassport.findUnique({
        where: {
          patientId: dto.patientId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'This patient already has a health passport.',
      );
    }

    return this.prisma.healthPassport.create({
      data: {
        patientId: dto.patientId,
        bloodType: dto.bloodType,
        organDonor: dto.organDonor ?? false,
        emergencyNotes: dto.emergencyNotes,
        shareByDefault: dto.shareByDefault ?? false,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },

        allergies: {
          include: {
            allergy: true,
          },
        },

        conditions: true,
        immunizations: true,
        medications: true,
      },
    });
  }

  async findAll(
    query: QueryHealthPassportDto,
  ) {
    const {
      page,
      limit,
      patientId,
    } = query;

    const where: Prisma.HealthPassportWhereInput = {
      ...(patientId && {
        patientId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.healthPassport.findMany({
          where,

          include: {
            patient: {
              include: {
                person: true,
              },
            },

            allergies: {
              include: {
                allergy: true,
              },
            },

            conditions: true,
            immunizations: true,
            medications: true,

            _count: {
              select: {
                allergies: true,
                conditions: true,
                immunizations: true,
                medications: true,
              },
            },
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.healthPassport.count({
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
    const passport =
      await this.prisma.healthPassport.findUnique({
        where: {
          id,
        },

        include: {
          patient: {
            include: {
              person: true,
            },
          },

          allergies: {
            include: {
              allergy: true,
            },
          },

          conditions: true,
          immunizations: true,
          medications: true,

          _count: {
            select: {
              allergies: true,
              conditions: true,
              immunizations: true,
              medications: true,
            },
          },
        },
      });

    if (!passport) {
      throw new NotFoundException(
        'Health passport not found.',
      );
    }

    return passport;
  }

  async update(
    id: string,
    dto: UpdateHealthPassportDto,
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

      const duplicate =
        await this.prisma.healthPassport.findFirst({
          where: {
            id: {
              not: id,
            },
            patientId: dto.patientId,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'This patient already has a health passport.',
        );
      }
    }

    return this.prisma.healthPassport.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        bloodType: dto.bloodType,
        organDonor: dto.organDonor,
        emergencyNotes: dto.emergencyNotes,
        shareByDefault: dto.shareByDefault,
      },

      include: {
        patient: {
          include: {
            person: true,
          },
        },

        allergies: {
          include: {
            allergy: true,
          },
        },

        conditions: true,
        immunizations: true,
        medications: true,

        _count: {
          select: {
            allergies: true,
            conditions: true,
            immunizations: true,
            medications: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.healthPassport.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Health passport deleted successfully.',
    };
  }
}