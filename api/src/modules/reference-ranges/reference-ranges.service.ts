import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateReferenceRangeDto } from './dto/create-reference-range.dto';
import { UpdateReferenceRangeDto } from './dto/update-reference-range.dto';
import { QueryReferenceRangeDto } from './dto/query-reference-range.dto';

@Injectable()
export class ReferenceRangesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateReferenceRangeDto,
  ) {
    const test =
      await this.prisma.labTest.findUnique({
        where: {
          id: dto.testId,
        },
      });

    if (!test) {
      throw new NotFoundException(
        'Lab test not found.',
      );
    }

    if (dto.unitId) {
      const unit =
        await this.prisma.labUnit.findUnique({
          where: {
            id: dto.unitId,
          },
        });

      if (!unit) {
        throw new NotFoundException(
          'Lab unit not found.',
        );
      }
    }

    return this.prisma.referenceRange.create({
      data: {
        ...dto,
      },

      include: {
        test: true,
        unit: true,
      },
    });
  }

  async findAll(
    query: QueryReferenceRangeDto,
  ) {
    const {
      page,
      limit,
      testId,
      unitId,
      gender,
    } = query;

    const where: Prisma.ReferenceRangeWhereInput = {
      ...(testId && {
        testId,
      }),

      ...(unitId && {
        unitId,
      }),

      ...(gender && {
        gender,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.referenceRange.findMany({
          where,

          include: {
            test: true,
            unit: true,
          },

          orderBy: [
            {
              test: {
                name: 'asc',
              },
            },
            {
              minimumAge: 'asc',
            },
          ],

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.referenceRange.count({
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
    const referenceRange =
      await this.prisma.referenceRange.findUnique({
        where: {
          id,
        },

        include: {
          test: true,
          unit: true,
        },
      });

    if (!referenceRange) {
      throw new NotFoundException(
        'Reference range not found.',
      );
    }

    return referenceRange;
  }

  async update(
    id: string,
    dto: UpdateReferenceRangeDto,
  ) {
    const referenceRange =
      await this.prisma.referenceRange.findUnique({
        where: {
          id,
        },
      });

    if (!referenceRange) {
      throw new NotFoundException(
        'Reference range not found.',
      );
    }

    if (
      dto.testId &&
      dto.testId !== referenceRange.testId
    ) {
      const test =
        await this.prisma.labTest.findUnique({
          where: {
            id: dto.testId,
          },
        });

      if (!test) {
        throw new NotFoundException(
          'Lab test not found.',
        );
      }
    }

    if (
      dto.unitId &&
      dto.unitId !== referenceRange.unitId
    ) {
      const unit =
        await this.prisma.labUnit.findUnique({
          where: {
            id: dto.unitId,
          },
        });

      if (!unit) {
        throw new NotFoundException(
          'Lab unit not found.',
        );
      }
    }

    return this.prisma.referenceRange.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        test: true,
        unit: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const referenceRange =
      await this.prisma.referenceRange.findUnique({
        where: {
          id,
        },
      });

    if (!referenceRange) {
      throw new NotFoundException(
        'Reference range not found.',
      );
    }

    await this.prisma.referenceRange.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Reference range deleted successfully.',
    };
  }
}