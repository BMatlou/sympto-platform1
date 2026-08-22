import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAIRecommendationDto } from './dto/create-ai-recommendation.dto';
import { UpdateAIRecommendationDto } from './dto/update-ai-recommendation.dto';
import { QueryAIRecommendationDto } from './dto/query-ai-recommendation.dto';

@Injectable()
export class AIRecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAIRecommendationDto,
  ) {
    const assessment =
      await this.prisma.aISymptomAssessment.findUnique({
        where: {
          id: dto.assessmentId,
        },
      });

    if (!assessment) {
      throw new NotFoundException(
        'AI symptom assessment not found.',
      );
    }

    return this.prisma.aIRecommendation.create({
      data: {
        assessmentId: dto.assessmentId,
        recommendationType:
          dto.recommendationType,
        title: dto.title,
        description: dto.description,
      },

      include: {
        assessment: true,
      },
    });
  }

  async findAll(
    query: QueryAIRecommendationDto,
  ) {
    const {
      page,
      limit,
      assessmentId,
      recommendationType,
    } = query;

    const where: Prisma.AIRecommendationWhereInput =
      {
        ...(assessmentId && {
          assessmentId,
        }),

        ...(recommendationType && {
          recommendationType,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aIRecommendation.findMany({
          where,

          include: {
            assessment: true,
          },

          orderBy: {
            title: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aIRecommendation.count({
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
    const recommendation =
      await this.prisma.aIRecommendation.findUnique({
        where: {
          id,
        },

        include: {
          assessment: true,
        },
      });

    if (!recommendation) {
      throw new NotFoundException(
        'AI recommendation not found.',
      );
    }

    return recommendation;
  }

  async update(
    id: string,
    dto: UpdateAIRecommendationDto,
  ) {
    const recommendation =
      await this.prisma.aIRecommendation.findUnique({
        where: {
          id,
        },
      });

    if (!recommendation) {
      throw new NotFoundException(
        'AI recommendation not found.',
      );
    }

    if (
      dto.assessmentId &&
      dto.assessmentId !== recommendation.assessmentId
    ) {
      const assessment =
        await this.prisma.aISymptomAssessment.findUnique({
          where: {
            id: dto.assessmentId,
          },
        });

      if (!assessment) {
        throw new NotFoundException(
          'AI symptom assessment not found.',
        );
      }
    }

    return this.prisma.aIRecommendation.update({
      where: {
        id,
      },

      data: {
        ...(dto.assessmentId !== undefined && {
          assessmentId: dto.assessmentId,
        }),

        ...(dto.recommendationType !== undefined && {
          recommendationType:
            dto.recommendationType,
        }),

        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),
      },

      include: {
        assessment: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const recommendation =
      await this.prisma.aIRecommendation.findUnique({
        where: {
          id,
        },
      });

    if (!recommendation) {
      throw new NotFoundException(
        'AI recommendation not found.',
      );
    }

    await this.prisma.aIRecommendation.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'AI recommendation deleted successfully.',
    };
  }
}