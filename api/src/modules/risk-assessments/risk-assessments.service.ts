import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';
import { UpdateRiskAssessmentDto } from './dto/update-risk-assessment.dto';
import { QueryRiskAssessmentDto } from './dto/query-risk-assessment.dto';

@Injectable()
export class RiskAssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateRiskAssessmentDto,
  ) {
    return this.prisma.riskAssessment.create({
      data: {
        ...dto,
      },

      include: {
        patient: true,
        practitioner: true,
        clinicalEpisode: true,
        results: true,
      },
    });
  }

  async findAll(
    query: QueryRiskAssessmentDto,
  ) {
    const {
      page,
      limit,
      patientId,
      practitionerId,
      clinicalEpisodeId,
      assessmentType,
      overallRisk,
    } = query;

    const where: Prisma.RiskAssessmentWhereInput =
      {
        patientId,
        practitionerId,
        clinicalEpisodeId,
        assessmentType,
        overallRisk,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.riskAssessment.findMany({
          where,

          include: {
            patient: true,
            practitioner: true,
            clinicalEpisode: true,
            results: true,
          },

          orderBy: {
            assessedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.riskAssessment.count({
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
    const assessment =
      await this.prisma.riskAssessment.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          practitioner: true,
          clinicalEpisode: true,
          results: true,
        },
      });

    if (!assessment) {
      throw new NotFoundException(
        'Risk assessment not found.',
      );
    }

    return assessment;
  }

  async update(
    id: string,
    dto: UpdateRiskAssessmentDto,
  ) {
    await this.findOne(id);

    return this.prisma.riskAssessment.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        patient: true,
        practitioner: true,
        clinicalEpisode: true,
        results: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.riskAssessment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Risk assessment deleted successfully.',
    };
  }
}