import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabAuditDto } from './dto/create-lab-audit.dto';
import { UpdateLabAuditDto } from './dto/update-lab-audit.dto';
import { QueryLabAuditDto } from './dto/query-lab-audit.dto';

@Injectable()
export class LabAuditsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabAuditDto,
  ) {
    const laboratory =
      await this.prisma.laboratory.findUnique({
        where: {
          id: dto.laboratoryId,
        },
      });

    if (!laboratory) {
      throw new NotFoundException(
        'Laboratory not found.',
      );
    }

    if (dto.auditorId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.auditorId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    return this.prisma.labAudit.create({
      data: {
        laboratoryId: dto.laboratoryId,
        auditorId: dto.auditorId,
        auditDate: new Date(dto.auditDate),
        outcome: dto.outcome,
        findings: dto.findings,
        recommendations: dto.recommendations,
      },

      include: {
        laboratory: true,
        auditor: true,
      },
    });
  }

  async findAll(
    query: QueryLabAuditDto,
  ) {
    const {
      page,
      limit,
      laboratoryId,
      auditorId,
    } = query;

    const where: Prisma.LabAuditWhereInput = {
      ...(laboratoryId && {
        laboratoryId,
      }),

      ...(auditorId && {
        auditorId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labAudit.findMany({
          where,

          include: {
            laboratory: true,
            auditor: true,
          },

          orderBy: {
            auditDate: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labAudit.count({
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

  async findOne(id: string) {
    const audit =
      await this.prisma.labAudit.findUnique({
        where: {
          id,
        },

        include: {
          laboratory: true,
          auditor: true,
        },
      });

    if (!audit) {
      throw new NotFoundException(
        'Lab audit not found.',
      );
    }

    return audit;
  }

  async update(
    id: string,
    dto: UpdateLabAuditDto,
  ) {
    await this.findOne(id);

    if (dto.laboratoryId) {
      const laboratory =
        await this.prisma.laboratory.findUnique({
          where: {
            id: dto.laboratoryId,
          },
        });

      if (!laboratory) {
        throw new NotFoundException(
          'Laboratory not found.',
        );
      }
    }

    if (dto.auditorId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.auditorId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    return this.prisma.labAudit.update({
      where: {
        id,
      },

      data: {
        laboratoryId: dto.laboratoryId,
        auditorId: dto.auditorId,
        auditDate: dto.auditDate
          ? new Date(dto.auditDate)
          : undefined,
        outcome: dto.outcome,
        findings: dto.findings,
        recommendations: dto.recommendations,
      },

      include: {
        laboratory: true,
        auditor: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labAudit.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab audit deleted successfully.',
    };
  }
}