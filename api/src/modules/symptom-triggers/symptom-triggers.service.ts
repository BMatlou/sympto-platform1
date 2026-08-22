import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSymptomTriggerDto } from './dto/create-symptom-trigger.dto';
import { UpdateSymptomTriggerDto } from './dto/update-symptom-trigger.dto';
import { QuerySymptomTriggerDto } from './dto/query-symptom-trigger.dto';

@Injectable()
export class SymptomTriggersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSymptomTriggerDto,
  ) {
    return this.prisma.symptomTrigger.create({
      data: {
        ...dto,
        exposureAt: dto.exposureAt
          ? new Date(dto.exposureAt)
          : undefined,
      },

      include: {
        symptomLog: true,
      },
    });
  }

  async findAll(
    query: QuerySymptomTriggerDto,
  ) {
    const {
      page,
      limit,
      symptomLogId,
      suspected,
      confirmed,
    } = query;

    const where: Prisma.SymptomTriggerWhereInput =
      {
        symptomLogId,
        suspected,
        confirmed,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.symptomTrigger.findMany({
          where,

          include: {
            symptomLog: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.symptomTrigger.count({
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
    const trigger =
      await this.prisma.symptomTrigger.findUnique({
        where: {
          id,
        },

        include: {
          symptomLog: true,
        },
      });

    if (!trigger) {
      throw new NotFoundException(
        'Symptom trigger not found.',
      );
    }

    return trigger;
  }

  async update(
    id: string,
    dto: UpdateSymptomTriggerDto,
  ) {
    await this.findOne(id);

    return this.prisma.symptomTrigger.update({
      where: {
        id,
      },

      data: {
        ...dto,
        exposureAt: dto.exposureAt
          ? new Date(dto.exposureAt)
          : undefined,
      },

      include: {
        symptomLog: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.symptomTrigger.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Symptom trigger deleted successfully.',
    };
  }
}