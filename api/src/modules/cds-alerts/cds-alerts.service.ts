import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

import { CreateCdsAlertDto } from './dto/create-cds-alert.dto';
import { UpdateCdsAlertDto } from './dto/update-cds-alert.dto';
import { QueryCdsAlertDto } from './dto/query-cds-alert.dto';

@Injectable()
export class CdsAlertsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCdsAlertDto) {
    const cds =
      await this.prisma.clinicalDecisionSupport.findUnique({
        where: {
          id: dto.clinicalDecisionSupportId,
        },
      });

    if (!cds) {
      throw new NotFoundException(
        'Clinical decision support record not found.',
      );
    }

    return this.prisma.cDSAlert.create({
      data: {
        clinicalDecisionSupportId:
          dto.clinicalDecisionSupportId,
        title: dto.title,
        message: dto.message,
        severity: dto.severity,
        acknowledged:
          dto.acknowledged ?? false,
        acknowledgedAt: dto.acknowledgedAt,
      },

      include: {
        clinicalDecisionSupport: true,
      },
    });
  }

  async findAll(
    query: QueryCdsAlertDto,
  ) {
    const {
      page,
      limit,
      clinicalDecisionSupportId,
      severity,
      acknowledged,
    } = query;

    const where: Prisma.CDSAlertWhereInput = {
      ...(clinicalDecisionSupportId && {
        clinicalDecisionSupportId,
      }),

      ...(severity && {
        severity,
      }),

      ...(acknowledged !== undefined && {
        acknowledged,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.cDSAlert.findMany({
          where,

          include: {
            clinicalDecisionSupport: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.cDSAlert.count({
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
    const alert =
      await this.prisma.cDSAlert.findUnique({
        where: {
          id,
        },

        include: {
          clinicalDecisionSupport: true,
        },
      });

    if (!alert) {
      throw new NotFoundException(
        'CDS alert not found.',
      );
    }

    return alert;
  }

  async update(
    id: string,
    dto: UpdateCdsAlertDto,
  ) {
    await this.findOne(id);

    if (
      dto.clinicalDecisionSupportId
    ) {
      const cds =
        await this.prisma.clinicalDecisionSupport.findUnique({
          where: {
            id: dto.clinicalDecisionSupportId,
          },
        });

      if (!cds) {
        throw new NotFoundException(
          'Clinical decision support record not found.',
        );
      }
    }

    return this.prisma.cDSAlert.update({
      where: {
        id,
      },

      data: {
        clinicalDecisionSupportId:
          dto.clinicalDecisionSupportId,
        title: dto.title,
        message: dto.message,
        severity: dto.severity,
        acknowledged:
          dto.acknowledged,
        acknowledgedAt:
          dto.acknowledgedAt,
      },

      include: {
        clinicalDecisionSupport: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.cDSAlert.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'CDS alert deleted successfully.',
    };
  }
}