import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateCriticalResultDto } from './dto/create-critical-result.dto';
import { UpdateCriticalResultDto } from './dto/update-critical-result.dto';
import { QueryCriticalResultDto } from './dto/query-critical-result.dto';

@Injectable()
export class CriticalResultsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCriticalResultDto,
  ) {
    const result =
      await this.prisma.labResult.findUnique({
        where: {
          id: dto.resultId,
        },
      });

    if (!result) {
      throw new NotFoundException(
        'Lab result not found.',
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

    return this.prisma.criticalResult.create({
      data: {
        resultId: dto.resultId,
        practitionerId: dto.practitionerId,
        notifiedAt: dto.notifiedAt
          ? new Date(dto.notifiedAt)
          : undefined,
        acknowledgedAt: dto.acknowledgedAt
          ? new Date(dto.acknowledgedAt)
          : undefined,
        comments: dto.comments,
      },

      include: {
        result: true,
        practitioner: true,
      },
    });
  }

  async findAll(
    query: QueryCriticalResultDto,
  ) {
    const {
      page,
      limit,
      resultId,
      practitionerId,
    } = query;

    const where = {
      ...(resultId && {
        resultId,
      }),

      ...(practitionerId && {
        practitionerId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.criticalResult.findMany({
          where,

          include: {
            result: true,
            practitioner: true,
          },

          orderBy: {
            notifiedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.criticalResult.count({
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
    const critical =
      await this.prisma.criticalResult.findUnique({
        where: {
          id,
        },

        include: {
          result: true,
          practitioner: true,
        },
      });

    if (!critical) {
      throw new NotFoundException(
        'Critical result not found.',
      );
    }

    return critical;
  }

  async update(
    id: string,
    dto: UpdateCriticalResultDto,
  ) {
    await this.findOne(id);

    return this.prisma.criticalResult.update({
      where: {
        id,
      },

      data: {
        resultId: dto.resultId,
        practitionerId: dto.practitionerId,
        notifiedAt: dto.notifiedAt
          ? new Date(dto.notifiedAt)
          : undefined,
        acknowledgedAt:
          dto.acknowledgedAt
            ? new Date(
                dto.acknowledgedAt,
              )
            : undefined,
        comments: dto.comments,
      },

      include: {
        result: true,
        practitioner: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.criticalResult.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Critical result deleted successfully.',
    };
  }
}