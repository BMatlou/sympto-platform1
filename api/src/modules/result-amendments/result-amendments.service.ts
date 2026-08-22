import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateResultAmendmentDto } from './dto/create-result-amendment.dto';
import { UpdateResultAmendmentDto } from './dto/update-result-amendment.dto';
import { QueryResultAmendmentDto } from './dto/query-result-amendment.dto';

@Injectable()
export class ResultAmendmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateResultAmendmentDto,
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

    return this.prisma.resultAmendment.create({
      data: {
        resultId: dto.resultId,
        practitionerId: dto.practitionerId,
        reason: dto.reason,
        amendedAt: dto.amendedAt
          ? new Date(dto.amendedAt)
          : undefined,
      },

      include: {
        result: true,
        practitioner: true,
      },
    });
  }

  async findAll(
    query: QueryResultAmendmentDto,
  ) {
    const {
      page,
      limit,
      resultId,
      practitionerId,
    } = query;

    const where = {
      ...(resultId && { resultId }),
      ...(practitionerId && {
        practitionerId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.resultAmendment.findMany({
          where,

          include: {
            result: true,
            practitioner: true,
          },

          orderBy: {
            amendedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.resultAmendment.count({
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
    const amendment =
      await this.prisma.resultAmendment.findUnique({
        where: {
          id,
        },

        include: {
          result: true,
          practitioner: true,
        },
      });

    if (!amendment) {
      throw new NotFoundException(
        'Result amendment not found.',
      );
    }

    return amendment;
  }

  async update(
    id: string,
    dto: UpdateResultAmendmentDto,
  ) {
    await this.findOne(id);

    return this.prisma.resultAmendment.update({
      where: {
        id,
      },

      data: {
        resultId: dto.resultId,
        practitionerId:
          dto.practitionerId,
        reason: dto.reason,
        amendedAt: dto.amendedAt
          ? new Date(dto.amendedAt)
          : undefined,
      },

      include: {
        result: true,
        practitioner: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.resultAmendment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Result amendment deleted successfully.',
    };
  }
}