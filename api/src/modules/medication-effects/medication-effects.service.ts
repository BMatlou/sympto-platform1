import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateMedicationEffectDto } from './dto/create-medication-effect.dto';
import { UpdateMedicationEffectDto } from './dto/update-medication-effect.dto';
import { QueryMedicationEffectDto } from './dto/query-medication-effect.dto';

@Injectable()
export class MedicationEffectsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateMedicationEffectDto,
  ) {
    return this.prisma.medicationEffect.create({
      data: {
        ...dto,

        startedMedicationAt: dto.startedMedicationAt
          ? new Date(dto.startedMedicationAt)
          : undefined,

        improvementObservedAt:
          dto.improvementObservedAt
            ? new Date(
                dto.improvementObservedAt,
              )
            : undefined,

        stoppedMedicationAt:
          dto.stoppedMedicationAt
            ? new Date(
                dto.stoppedMedicationAt,
              )
            : undefined,
      },

      include: {
        symptomLog: true,
        medication: true,
        prescription: true,
      },
    });
  }

  async findAll(
    query: QueryMedicationEffectDto,
  ) {
    const {
      page,
      limit,
      symptomLogId,
      medicationId,
      prescriptionId,
      improved,
    } = query;

    const where: Prisma.MedicationEffectWhereInput =
      {
        symptomLogId,
        medicationId,
        prescriptionId,
        improved,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.medicationEffect.findMany({
          where,

          include: {
            symptomLog: true,
            medication: true,
            prescription: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.medicationEffect.count({
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
    const effect =
      await this.prisma.medicationEffect.findUnique({
        where: {
          id,
        },

        include: {
          symptomLog: true,
          medication: true,
          prescription: true,
        },
      });

    if (!effect) {
      throw new NotFoundException(
        'Medication effect not found.',
      );
    }

    return effect;
  }

  async update(
    id: string,
    dto: UpdateMedicationEffectDto,
  ) {
    await this.findOne(id);

    return this.prisma.medicationEffect.update({
      where: {
        id,
      },

      data: {
        ...dto,

        startedMedicationAt: dto.startedMedicationAt
          ? new Date(dto.startedMedicationAt)
          : undefined,

        improvementObservedAt:
          dto.improvementObservedAt
            ? new Date(
                dto.improvementObservedAt,
              )
            : undefined,

        stoppedMedicationAt:
          dto.stoppedMedicationAt
            ? new Date(
                dto.stoppedMedicationAt,
              )
            : undefined,
      },

      include: {
        symptomLog: true,
        medication: true,
        prescription: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.medicationEffect.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Medication effect deleted successfully.',
    };
  }
}