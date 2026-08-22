import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateCdsRuleExecutionDto } from './dto/create-cds-rule-execution.dto';
import { UpdateCdsRuleExecutionDto } from './dto/update-cds-rule-execution.dto';
import { QueryCdsRuleExecutionDto } from './dto/query-cds-rule-execution.dto';

@Injectable()
export class CdsRuleExecutionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCdsRuleExecutionDto,
  ) {
    const rule =
      await this.prisma.cDSRule.findUnique({
        where: {
          id: dto.ruleId,
        },
      });

    if (!rule) {
      throw new NotFoundException(
        'CDS rule not found.',
      );
    }

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

    return this.prisma.cDSRuleExecution.create({
      data: {
        ruleId: dto.ruleId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        triggered: dto.triggered,
        score: dto.score,
      },

      include: {
        rule: true,
        patient: true,
        encounter: true,
      },
    });
  }

  async findAll(
    query: QueryCdsRuleExecutionDto,
  ) {
    const {
      page,
      limit,
      ruleId,
      patientId,
      triggered,
    } = query;

    const where: Prisma.CDSRuleExecutionWhereInput =
      {
        ...(ruleId && {
          ruleId,
        }),

        ...(patientId && {
          patientId,
        }),

        ...(triggered !==
          undefined && {
          triggered,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.cDSRuleExecution.findMany({
          where,

          include: {
            rule: true,
            patient: true,
            encounter: true,
          },

          orderBy: {
            executedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.cDSRuleExecution.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit,
          ),
      },
    };
  }

  async findOne(
    id: string,
  ) {
    const execution =
      await this.prisma.cDSRuleExecution.findUnique({
        where: {
          id,
        },

        include: {
          rule: true,
          patient: true,
          encounter: true,
        },
      });

    if (!execution) {
      throw new NotFoundException(
        'CDS rule execution not found.',
      );
    }

    return execution;
  }

  async update(
    id: string,
    dto: UpdateCdsRuleExecutionDto,
  ) {
    await this.findOne(id);

    if (dto.ruleId) {
      const rule =
        await this.prisma.cDSRule.findUnique({
          where: {
            id: dto.ruleId,
          },
        });

      if (!rule) {
        throw new NotFoundException(
          'CDS rule not found.',
        );
      }
    }

    if (dto.patientId) {
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

    return this.prisma.cDSRuleExecution.update({
      where: {
        id,
      },

      data: {
        ruleId: dto.ruleId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        triggered: dto.triggered,
        score: dto.score,
      },

      include: {
        rule: true,
        patient: true,
        encounter: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.cDSRuleExecution.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'CDS rule execution deleted successfully.',
    };
  }
}