import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateClinicalVitalDto } from './dto/create-clinical-vital.dto';
import { UpdateClinicalVitalDto } from './dto/update-clinical-vital.dto';
import { QueryClinicalVitalDto } from './dto/query-clinical-vital.dto';

@Injectable()
export class ClinicalVitalsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateClinicalVitalDto,
  ) {
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

    const vitalType =
      await this.prisma.vitalType.findUnique({
        where: {
          id: dto.vitalTypeId,
        },
      });

    if (!vitalType) {
      throw new NotFoundException(
        'Vital type not found.',
      );
    }

    return this.prisma.clinicalVital.create({
      data: {
        encounterId: dto.encounterId,
        vitalTypeId: dto.vitalTypeId,
        value: dto.value,
        measuredAt: new Date(
          dto.measuredAt,
        ),
      },

      include: {
        encounter: true,
        vitalType: true,
      },
    });
  }

  async findAll(
    query: QueryClinicalVitalDto,
  ) {
    const {
      page,
      limit,
      encounterId,
      vitalTypeId,
    } = query;

    const where = {
      ...(encounterId && {
        encounterId,
      }),
      ...(vitalTypeId && {
        vitalTypeId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.clinicalVital.findMany({
          where,

          include: {
            encounter: true,
            vitalType: true,
          },

          orderBy: {
            measuredAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.clinicalVital.count({
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
    const vital =
      await this.prisma.clinicalVital.findUnique({
        where: {
          id,
        },

        include: {
          encounter: true,
          vitalType: true,
        },
      });

    if (!vital) {
      throw new NotFoundException(
        'Clinical vital not found.',
      );
    }

    return vital;
  }

  async update(
    id: string,
    dto: UpdateClinicalVitalDto,
  ) {
    await this.findOne(id);

    return this.prisma.clinicalVital.update({
      where: {
        id,
      },

      data: {
        encounterId: dto.encounterId,
        vitalTypeId: dto.vitalTypeId,
        value: dto.value,
        measuredAt: dto.measuredAt
          ? new Date(dto.measuredAt)
          : undefined,
      },

      include: {
        encounter: true,
        vitalType: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.clinicalVital.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Clinical vital deleted successfully.',
    };
  }
}