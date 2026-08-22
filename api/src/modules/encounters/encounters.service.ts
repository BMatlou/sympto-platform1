import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { QueryEncounterDto } from './dto/query-encounter.dto';

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateEncounterDto) {
    const medicalRecord =
      await this.prisma.medicalRecord.findUnique({
        where: {
          id: dto.medicalRecordId,
        },
      });

    if (!medicalRecord) {
      throw new NotFoundException(
        'Medical record not found.',
      );
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

    const encounterType =
      await this.prisma.encounterType.findUnique({
        where: {
          id: dto.encounterTypeId,
        },
      });

    if (!encounterType) {
      throw new NotFoundException(
        'Encounter type not found.',
      );
    }

    return this.prisma.encounter.create({
      data: {
        medicalRecordId: dto.medicalRecordId,
        practitionerId: dto.practitionerId,
        encounterTypeId: dto.encounterTypeId,
        startedAt: new Date(dto.startedAt),
        endedAt: dto.endedAt
          ? new Date(dto.endedAt)
          : undefined,
        chiefComplaint: dto.chiefComplaint,
        assessment: dto.assessment,
        plan: dto.plan,
        notes: dto.notes,
      },

      include: {
        medicalRecord: {
          include: {
            patient: {
              include: {
                person: true,
              },
            },
          },
        },

        practitioner: {
          include: {
            person: true,
          },
        },

        encounterType: true,
      },
    });
  }

  async findAll(query: QueryEncounterDto) {
    const {
      page,
      limit,
      medicalRecordId,
      practitionerId,
      search,
    } = query;

    const where = {
      ...(medicalRecordId && {
        medicalRecordId,
      }),

      ...(practitionerId && {
        practitionerId,
      }),

      ...(search && {
        OR: [
          {
            chiefComplaint: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            assessment: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            notes: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const [encounters, total] =
      await this.prisma.$transaction([
        this.prisma.encounter.findMany({
          where,

          include: {
            medicalRecord: {
              include: {
                patient: {
                  include: {
                    person: true,
                  },
                },
              },
            },

            practitioner: {
              include: {
                person: true,
              },
            },

            encounterType: true,
          },

          orderBy: {
            startedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.encounter.count({
          where,
        }),
      ]);

    return {
      data: encounters,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const encounter =
      await this.prisma.encounter.findUnique({
        where: {
          id,
        },

        include: {
          medicalRecord: {
            include: {
              patient: {
                include: {
                  person: true,
                },
              },
            },
          },

          practitioner: {
            include: {
              person: true,
            },
          },

          encounterType: true,

          vitals: true,

          diagnoses: true,

          procedures: true,

          clinicalNotes: true,

          prescriptions: true,

          labOrders: true,

          imagingOrders: true,

          imagingStudies: true,

          aianalyses: true,
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Encounter not found.',
      );
    }

    return encounter;
  }

  async update(
    id: string,
    dto: UpdateEncounterDto,
  ) {
    await this.findOne(id);

    return this.prisma.encounter.update({
      where: {
        id,
      },

      data: {
        practitionerId: dto.practitionerId,
        encounterTypeId: dto.encounterTypeId,
        startedAt: dto.startedAt
          ? new Date(dto.startedAt)
          : undefined,
        endedAt: dto.endedAt
          ? new Date(dto.endedAt)
          : undefined,
        chiefComplaint: dto.chiefComplaint,
        assessment: dto.assessment,
        plan: dto.plan,
        notes: dto.notes,
      },

      include: {
        medicalRecord: true,
        practitioner: true,
        encounterType: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.encounter.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Encounter deleted successfully.',
    };
  }
}