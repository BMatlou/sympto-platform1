import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAIClinicalReviewDto } from './dto/create-ai-clinical-review.dto';
import { UpdateAIClinicalReviewDto } from './dto/update-ai-clinical-review.dto';
import { QueryAIClinicalReviewDto } from './dto/query-ai-clinical-review.dto';

@Injectable()
export class AIClinicalReviewsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAIClinicalReviewDto,
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

    return this.prisma.aIClinicalReview.create({
      data: {
        assessmentId: dto.assessmentId,
        practitionerId: dto.practitionerId,
        agreed: dto.agreed,
        notes: dto.notes,
      },

      include: {
        assessment: true,
        practitioner: true,
      },
    });
  }

  async findAll(
    query: QueryAIClinicalReviewDto,
  ) {
    const {
      page,
      limit,
      assessmentId,
      practitionerId,
      agreed,
    } = query;

    const where: Prisma.AIClinicalReviewWhereInput =
      {
        ...(assessmentId && {
          assessmentId,
        }),

        ...(practitionerId && {
          practitionerId,
        }),

        ...(agreed !== undefined && {
          agreed,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aIClinicalReview.findMany({
          where,

          include: {
            assessment: true,
            practitioner: true,
          },

          orderBy: {
            reviewedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aIClinicalReview.count({
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
    const review =
      await this.prisma.aIClinicalReview.findUnique({
        where: {
          id,
        },

        include: {
          assessment: true,
          practitioner: true,
        },
      });

    if (!review) {
      throw new NotFoundException(
        'AI clinical review not found.',
      );
    }

    return review;
  }

  async update(
    id: string,
    dto: UpdateAIClinicalReviewDto,
  ) {
    const review =
      await this.prisma.aIClinicalReview.findUnique({
        where: {
          id,
        },
      });

    if (!review) {
      throw new NotFoundException(
        'AI clinical review not found.',
      );
    }

    if (
      dto.assessmentId &&
      dto.assessmentId !== review.assessmentId
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

    if (
      dto.practitionerId &&
      dto.practitionerId !== review.practitionerId
    ) {
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

    return this.prisma.aIClinicalReview.update({
      where: {
        id,
      },

      data: {
        ...(dto.assessmentId !== undefined && {
          assessmentId: dto.assessmentId,
        }),

        ...(dto.practitionerId !== undefined && {
          practitionerId: dto.practitionerId,
        }),

        ...(dto.agreed !== undefined && {
          agreed: dto.agreed,
        }),

        ...(dto.notes !== undefined && {
          notes: dto.notes,
        }),
      },

      include: {
        assessment: true,
        practitioner: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const review =
      await this.prisma.aIClinicalReview.findUnique({
        where: {
          id,
        },
      });

    if (!review) {
      throw new NotFoundException(
        'AI clinical review not found.',
      );
    }

    await this.prisma.aIClinicalReview.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'AI clinical review deleted successfully.',
    };
  }
}