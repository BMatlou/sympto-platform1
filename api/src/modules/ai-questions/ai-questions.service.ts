import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAIQuestionDto } from './dto/create-ai-question.dto';
import { UpdateAIQuestionDto } from './dto/update-ai-question.dto';
import { QueryAIQuestionDto } from './dto/query-ai-question.dto';

@Injectable()
export class AIQuestionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAIQuestionDto,
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

    return this.prisma.aIQuestion.create({
      data: {
        assessmentId: dto.assessmentId,
        question: dto.question,
        type: dto.type,
        answer: dto.answer,
      },

      include: {
        assessment: true,
      },
    });
  }

  async findAll(
    query: QueryAIQuestionDto,
  ) {
    const {
      page,
      limit,
      assessmentId,
      type,
    } = query;

    const where: Prisma.AIQuestionWhereInput = {
      ...(assessmentId && {
        assessmentId,
      }),

      ...(type && {
        type,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aIQuestion.findMany({
          where,

          include: {
            assessment: true,
          },

          orderBy: {
            question: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aIQuestion.count({
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
    const question =
      await this.prisma.aIQuestion.findUnique({
        where: {
          id,
        },

        include: {
          assessment: true,
        },
      });

    if (!question) {
      throw new NotFoundException(
        'AI question not found.',
      );
    }

    return question;
  }

  async update(
    id: string,
    dto: UpdateAIQuestionDto,
  ) {
    const question =
      await this.prisma.aIQuestion.findUnique({
        where: {
          id,
        },
      });

    if (!question) {
      throw new NotFoundException(
        'AI question not found.',
      );
    }

    if (
      dto.assessmentId &&
      dto.assessmentId !== question.assessmentId
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

    return this.prisma.aIQuestion.update({
      where: {
        id,
      },

      data: {
        ...(dto.assessmentId !== undefined && {
          assessmentId: dto.assessmentId,
        }),

        ...(dto.question !== undefined && {
          question: dto.question,
        }),

        ...(dto.type !== undefined && {
          type: dto.type,
        }),

        ...(dto.answer !== undefined && {
          answer: dto.answer,
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
    const question =
      await this.prisma.aIQuestion.findUnique({
        where: {
          id,
        },
      });

    if (!question) {
      throw new NotFoundException(
        'AI question not found.',
      );
    }

    await this.prisma.aIQuestion.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'AI question deleted successfully.',
    };
  }
}