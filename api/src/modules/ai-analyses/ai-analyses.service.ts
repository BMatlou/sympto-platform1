import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAIAnalysisDto } from './dto/create-ai-analysis.dto';
import { UpdateAIAnalysisDto } from './dto/update-ai-analysis.dto';
import { QueryAIAnalysisDto } from './dto/query-ai-analysis.dto';

@Injectable()
export class AIAnalysesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAIAnalysisDto,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    if (dto.practitionerId) {
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

    if (dto.encounterId) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    return this.prisma.aIAnalysis.create({
      data: {
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        encounterId: dto.encounterId,
        analysisType: dto.analysisType,
        summary: dto.summary,
        requestPayload: dto.requestPayload,
        responsePayload: dto.responsePayload,
        status: dto.status,
      },

      include: {
        patient: true,
        practitioner: true,
        encounter: true,
      },
    });
  }

  async findAll(
    query: QueryAIAnalysisDto,
  ) {
    const {
      page,
      limit,
      patientId,
      practitionerId,
      encounterId,
      analysisType,
      status,
    } = query;

    const where: Prisma.AIAnalysisWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(practitionerId && {
        practitionerId,
      }),

      ...(encounterId && {
        encounterId,
      }),

      ...(analysisType && {
        analysisType,
      }),

      ...(status && {
        status,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aIAnalysis.findMany({
          where,

          include: {
            patient: true,
            practitioner: true,
            encounter: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aIAnalysis.count({
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
    const analysis =
      await this.prisma.aIAnalysis.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          practitioner: true,
          encounter: true,
        },
      });

    if (!analysis) {
      throw new NotFoundException(
        'AI analysis not found.',
      );
    }

    return analysis;
  }

  async update(
    id: string,
    dto: UpdateAIAnalysisDto,
  ) {
    const analysis =
      await this.prisma.aIAnalysis.findUnique({
        where: {
          id,
        },
      });

    if (!analysis) {
      throw new NotFoundException(
        'AI analysis not found.',
      );
    }

    if (
      dto.patientId &&
      dto.patientId !== analysis.patientId
    ) {
      const patient =
        await this.prisma.patient.findUnique({
          where: {
            id: dto.patientId,
          },
        });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }
    }

    if (
      dto.practitionerId &&
      dto.practitionerId !== analysis.practitionerId
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

    if (
      dto.encounterId &&
      dto.encounterId !== analysis.encounterId
    ) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    return this.prisma.aIAnalysis.update({
      where: {
        id,
      },

      data: {
        ...(dto.patientId !== undefined && {
          patientId: dto.patientId,
        }),

        ...(dto.practitionerId !== undefined && {
          practitionerId: dto.practitionerId,
        }),

        ...(dto.encounterId !== undefined && {
          encounterId: dto.encounterId,
        }),

        ...(dto.analysisType !== undefined && {
          analysisType: dto.analysisType,
        }),

        ...(dto.summary !== undefined && {
          summary: dto.summary,
        }),

        ...(dto.requestPayload !== undefined && {
          requestPayload: dto.requestPayload,
        }),

        ...(dto.responsePayload !== undefined && {
          responsePayload: dto.responsePayload,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),
      },

      include: {
        patient: true,
        practitioner: true,
        encounter: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const analysis =
      await this.prisma.aIAnalysis.findUnique({
        where: {
          id,
        },
      });

    if (!analysis) {
      throw new NotFoundException(
        'AI analysis not found.',
      );
    }

    await this.prisma.aIAnalysis.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'AI analysis deleted successfully.',
    };
  }
}