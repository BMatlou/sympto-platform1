import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAISymptomDto } from './dto/create-ai-symptom.dto';
import { UpdateAISymptomDto } from './dto/update-ai-symptom.dto';
import { QueryAISymptomDto } from './dto/query-ai-symptom.dto';

@Injectable()
export class AISymptomsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateAISymptomDto) {
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

    return this.prisma.aISymptom.create({
      data: {
        assessmentId: dto.assessmentId,
        symptomId: dto.symptomId,
        duration: dto.duration,
        severity: dto.severity,
        present: dto.present,
      },

      include: {
        assessment: true,
        symptom: true,
      },
    });
  }

  async findAll(query: QueryAISymptomDto) {
    const {
      page,
      limit,
      assessmentId,
      present,
      severity,
    } = query;

    const where: Prisma.AISymptomWhereInput = {
      ...(assessmentId && {
        assessmentId,
      }),

      ...(present !== undefined && {
        present,
      }),

      ...(severity !== undefined && {
        severity,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aISymptom.findMany({
          where,

          include: {
            assessment: true,
            symptom: true,
          },

          orderBy: {
            id: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aISymptom.count({
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
    const symptom =
      await this.prisma.aISymptom.findUnique({
        where: {
          id,
        },

        include: {
          assessment: true,
          symptom: true,
        },
      });

    if (!symptom) {
      throw new NotFoundException(
        'AI symptom not found.',
      );
    }

    return symptom;
  }

  async update(
    id: string,
    dto: UpdateAISymptomDto,
  ) {
    const symptom =
      await this.prisma.aISymptom.findUnique({
        where: {
          id,
        },
      });

    if (!symptom) {
      throw new NotFoundException(
        'AI symptom not found.',
      );
    }

    if (
      dto.assessmentId &&
      dto.assessmentId !== symptom.assessmentId
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

    return this.prisma.aISymptom.update({
      where: {
        id,
      },

      data: {
        ...(dto.assessmentId !== undefined && {
          assessmentId: dto.assessmentId,
        }),

        ...(dto.symptomId !== undefined && {
          symptomId: dto.symptomId,
        }),

        ...(dto.duration !== undefined && {
          duration: dto.duration,
        }),

        ...(dto.severity !== undefined && {
          severity: dto.severity,
        }),

        ...(dto.present !== undefined && {
          present: dto.present,
        }),
      },

      include: {
        assessment: true,
        symptom: true,
      },
    });
  }

  async remove(id: string) {
    const symptom =
      await this.prisma.aISymptom.findUnique({
        where: {
          id,
        },
      });

    if (!symptom) {
      throw new NotFoundException(
        'AI symptom not found.',
      );
    }

    await this.prisma.aISymptom.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'AI symptom deleted successfully.',
    };
  }
}