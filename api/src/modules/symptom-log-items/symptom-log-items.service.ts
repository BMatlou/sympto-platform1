import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSymptomLogItemDto } from './dto/create-symptom-log-item.dto';
import { UpdateSymptomLogItemDto } from './dto/update-symptom-log-item.dto';
import { QuerySymptomLogItemDto } from './dto/query-symptom-log-item.dto';

@Injectable()
export class SymptomLogItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateSymptomLogItemDto) {
    return this.prisma.symptomLogItem.create({
      data: {
        ...dto,
        onsetAt: dto.onsetAt
          ? new Date(dto.onsetAt)
          : undefined,
        resolvedAt: dto.resolvedAt
          ? new Date(dto.resolvedAt)
          : undefined,
      },
      include: {
        aisymptom: true,
        symptomLog: true,
      },
    });
  }

  async findAll(
    query: QuerySymptomLogItemDto,
  ) {
    const {
      page,
      limit,
      symptomLogId,
      aISymptomId,
      severity,
      progression,
    } = query;

    const where: Prisma.SymptomLogItemWhereInput =
      {
        symptomLogId,
        aISymptomId,
        severity,
        progression,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.symptomLogItem.findMany({
          where,

          include: {
            aisymptom: true,
            symptomLog: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.symptomLogItem.count({
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
    const item =
      await this.prisma.symptomLogItem.findUnique({
        where: {
          id,
        },

        include: {
          aisymptom: true,
          symptomLog: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Symptom log item not found.',
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateSymptomLogItemDto,
  ) {
    await this.findOne(id);

    return this.prisma.symptomLogItem.update({
      where: {
        id,
      },

      data: {
        ...dto,
        onsetAt: dto.onsetAt
          ? new Date(dto.onsetAt)
          : undefined,
        resolvedAt: dto.resolvedAt
          ? new Date(dto.resolvedAt)
          : undefined,
      },

      include: {
        aisymptom: true,
        symptomLog: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.symptomLogItem.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Symptom log item deleted successfully.',
    };
  }
}