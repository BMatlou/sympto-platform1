import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAIObservationDto } from './dto/create-ai-observation.dto';
import { UpdateAIObservationDto } from './dto/update-ai-observation.dto';
import { QueryAIObservationDto } from './dto/query-ai-observation.dto';

@Injectable()
export class AIObservationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAIObservationDto,
  ) {
    return this.prisma.aIObservation.create({
      data: {
        ...dto,
        reviewedAt: dto.reviewedAt
          ? new Date(dto.reviewedAt)
          : undefined,
      },

      include: {
        symptomLog: true,
        aiAnalysis: true,
      },
    });
  }

  async findAll(
    query: QueryAIObservationDto,
  ) {
    const {
      page,
      limit,
      symptomLogId,
      aiAnalysisId,
      requiresAttention,
      reviewed,
    } = query;

    const where: Prisma.AIObservationWhereInput =
      {
        symptomLogId,
        aiAnalysisId,
        requiresAttention,
        reviewed,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aIObservation.findMany({
          where,

          include: {
            symptomLog: true,
            aiAnalysis: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aIObservation.count({
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
    const observation =
      await this.prisma.aIObservation.findUnique({
        where: {
          id,
        },

        include: {
          symptomLog: true,
          aiAnalysis: true,
        },
      });

    if (!observation) {
      throw new NotFoundException(
        'AI observation not found.',
      );
    }

    return observation;
  }

  async update(
    id: string,
    dto: UpdateAIObservationDto,
  ) {
    await this.findOne(id);

    return this.prisma.aIObservation.update({
      where: {
        id,
      },

      data: {
        ...dto,

        reviewedAt: dto.reviewedAt
          ? new Date(dto.reviewedAt)
          : undefined,
      },

      include: {
        symptomLog: true,
        aiAnalysis: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.aIObservation.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'AI observation deleted successfully.',
    };
  }
}