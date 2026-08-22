import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateRiskAssessmentResultDto } from './dto/create-risk-assessment-result.dto';
import { UpdateRiskAssessmentResultDto } from './dto/update-risk-assessment-result.dto';
import { QueryRiskAssessmentResultDto } from './dto/query-risk-assessment-result.dto';

@Injectable()
export class RiskAssessmentResultsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateRiskAssessmentResultDto,
  ) {
    return this.prisma.riskAssessmentResult.create({
      data: {
        ...dto,
      },

      include: {
        riskAssessment: true,
      },
    });
  }

  async findAll(
    query: QueryRiskAssessmentResultDto,
  ) {
    const {
      page,
      limit,
      riskAssessmentId,
      factor,
    } = query;

    const where: Prisma.RiskAssessmentResultWhereInput =
      {
        riskAssessmentId,

        ...(factor && {
          factor: {
            contains: factor,
            mode: Prisma.QueryMode.insensitive,
          },
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.riskAssessmentResult.findMany({
          where,

          include: {
            riskAssessment: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.riskAssessmentResult.count({
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
    const result =
      await this.prisma.riskAssessmentResult.findUnique({
        where: {
          id,
        },

        include: {
          riskAssessment: true,
        },
      });

    if (!result) {
      throw new NotFoundException(
        'Risk assessment result not found.',
      );
    }

    return result;
  }

  async update(
    id: string,
    dto: UpdateRiskAssessmentResultDto,
  ) {
    await this.findOne(id);

    return this.prisma.riskAssessmentResult.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        riskAssessment: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.riskAssessmentResult.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Risk assessment result deleted successfully.',
    };
  }
}