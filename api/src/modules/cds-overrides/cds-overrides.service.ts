import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateCdsOverrideDto } from './dto/create-cds-override.dto';
import { UpdateCdsOverrideDto } from './dto/update-cds-override.dto';
import { QueryCdsOverrideDto } from './dto/query-cds-override.dto';

@Injectable()
export class CdsOverridesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCdsOverrideDto,
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

    return this.prisma.cDSOverride.create({
      data: {
        clinicalDecisionSupportId:
          dto.clinicalDecisionSupportId,
        practitionerId: dto.practitionerId,
        reason: dto.reason,
        comments: dto.comments,
      },

      include: {
        clinicalDecisionSupport: true,
        practitioner: true,
      },
    });
  }

  async findAll(
    query: QueryCdsOverrideDto,
  ) {
    const {
      page,
      limit,
      clinicalDecisionSupportId,
      practitionerId,
    } = query;

    const where: Prisma.CDSOverrideWhereInput = {
      ...(clinicalDecisionSupportId && {
        clinicalDecisionSupportId,
      }),

      ...(practitionerId && {
        practitionerId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.cDSOverride.findMany({
          where,

          include: {
            clinicalDecisionSupport: true,
            practitioner: true,
          },

          orderBy: {
            overriddenAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.cDSOverride.count({
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
    const override =
      await this.prisma.cDSOverride.findUnique({
        where: {
          id,
        },

        include: {
          clinicalDecisionSupport: true,
          practitioner: true,
        },
      });

    if (!override) {
      throw new NotFoundException(
        'CDS override not found.',
      );
    }

    return override;
  }

  async update(
    id: string,
    dto: UpdateCdsOverrideDto,
  ) {
    await this.findOne(id);

    if (dto.clinicalDecisionSupportId) {
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

    return this.prisma.cDSOverride.update({
      where: {
        id,
      },

      data: {
        clinicalDecisionSupportId:
          dto.clinicalDecisionSupportId,
        practitionerId: dto.practitionerId,
        reason: dto.reason,
        comments: dto.comments,
      },

      include: {
        clinicalDecisionSupport: true,
        practitioner: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.cDSOverride.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'CDS override deleted successfully.',
    };
  }
}