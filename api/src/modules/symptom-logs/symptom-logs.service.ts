import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSymptomLogDto } from './dto/create-symptom-log.dto';
import { UpdateSymptomLogDto } from './dto/update-symptom-log.dto';
import { QuerySymptomLogDto } from './dto/query-symptom-log.dto';

@Injectable()
export class SymptomLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateSymptomLogDto) {
    return this.prisma.symptomLog.create({
      data: {
        ...dto,
        startedAt: new Date(dto.startedAt),
        resolvedAt: dto.resolvedAt
          ? new Date(dto.resolvedAt)
          : undefined,
      },
    });
  }

  async findAll(query: QuerySymptomLogDto) {
    const {
      page,
      limit,
      search,
      clinicalEpisodeId,
      status,
      overallSeverity,
      progression,
    } = query;

    const where: Prisma.SymptomLogWhereInput = {
      clinicalEpisodeId,
      status,
      overallSeverity,
      progression,

      ...(search && {
        OR: [
          {
            title: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            notes: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.symptomLog.findMany({
          where,

          include: {
            clinicalEpisode: true,
            symptoms: true,
            triggers: true,
            medicationEffects: true,
            observations: true,
            attachments: true,
          },

          orderBy: {
            startedAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.symptomLog.count({
          where,
        }),
      ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const log =
      await this.prisma.symptomLog.findUnique({
        where: { id },

        include: {
          clinicalEpisode: true,
          symptoms: {
            include: {
              aisymptom: true,
            },
          },
          triggers: true,
          medicationEffects: {
            include: {
              medication: true,
              prescription: true,
            },
          },
          observations: true,
          attachments: {
            include: {
              attachment: true,
            },
          },
        },
      });

    if (!log) {
      throw new NotFoundException(
        'Symptom log not found.',
      );
    }

    return log;
  }

  async update(
    id: string,
    dto: UpdateSymptomLogDto,
  ) {
    await this.findOne(id);

    return this.prisma.symptomLog.update({
      where: { id },

      data: {
        ...dto,
        startedAt: dto.startedAt
          ? new Date(dto.startedAt)
          : undefined,
        resolvedAt: dto.resolvedAt
          ? new Date(dto.resolvedAt)
          : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.symptomLog.delete({
      where: { id },
    });

    return {
      message:
        'Symptom log deleted successfully.',
    };
  }
}