import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAIDifferentialDiagnosisDto } from './dto/create-ai-differential-diagnosis.dto';
import { UpdateAIDifferentialDiagnosisDto } from './dto/update-ai-differential-diagnosis.dto';
import { QueryAIDifferentialDiagnosisDto } from './dto/query-ai-differential-diagnosis.dto';

@Injectable()
export class AIDifferentialDiagnosesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAIDifferentialDiagnosisDto,
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

    return this.prisma.aIDifferentialDiagnosis.create({
      data: {
        assessmentId: dto.assessmentId,
        diagnosis: dto.diagnosis,
        probability: dto.probability,
        rank: dto.rank,
      },

      include: {
        assessment: true,
      },
    });
  }

  async findAll(
    query: QueryAIDifferentialDiagnosisDto,
  ) {
    const {
      page,
      limit,
      assessmentId,
    } = query;

    const where: Prisma.AIDifferentialDiagnosisWhereInput = {
      ...(assessmentId && {
        assessmentId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aIDifferentialDiagnosis.findMany({
          where,

          include: {
            assessment: true,
          },

          orderBy: {
            rank: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aIDifferentialDiagnosis.count({
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
    const diagnosis =
      await this.prisma.aIDifferentialDiagnosis.findUnique({
        where: {
          id,
        },

        include: {
          assessment: true,
        },
      });

    if (!diagnosis) {
      throw new NotFoundException(
        'AI differential diagnosis not found.',
      );
    }

    return diagnosis;
  }

  async update(
    id: string,
    dto: UpdateAIDifferentialDiagnosisDto,
  ) {
    const diagnosis =
      await this.prisma.aIDifferentialDiagnosis.findUnique({
        where: {
          id,
        },
      });

    if (!diagnosis) {
      throw new NotFoundException(
        'AI differential diagnosis not found.',
      );
    }

    if (
      dto.assessmentId &&
      dto.assessmentId !== diagnosis.assessmentId
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

    return this.prisma.aIDifferentialDiagnosis.update({
      where: {
        id,
      },

      data: {
        ...(dto.assessmentId !== undefined && {
          assessmentId: dto.assessmentId,
        }),

        ...(dto.diagnosis !== undefined && {
          diagnosis: dto.diagnosis,
        }),

        ...(dto.probability !== undefined && {
          probability: dto.probability,
        }),

        ...(dto.rank !== undefined && {
          rank: dto.rank,
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
    const diagnosis =
      await this.prisma.aIDifferentialDiagnosis.findUnique({
        where: {
          id,
        },
      });

    if (!diagnosis) {
      throw new NotFoundException(
        'AI differential diagnosis not found.',
      );
    }

    await this.prisma.aIDifferentialDiagnosis.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'AI differential diagnosis deleted successfully.',
    };
  }
}