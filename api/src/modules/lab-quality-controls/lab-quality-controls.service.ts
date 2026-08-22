import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabQualityControlDto } from './dto/create-lab-quality-control.dto';
import { UpdateLabQualityControlDto } from './dto/update-lab-quality-control.dto';
import { QueryLabQualityControlDto } from './dto/query-lab-quality-control.dto';

@Injectable()
export class LabQualityControlsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabQualityControlDto,
  ) {
    const instrument =
      await this.prisma.laboratoryInstrument.findUnique({
        where: {
          id: dto.instrumentId,
        },
      });

    if (!instrument) {
      throw new NotFoundException(
        'Laboratory instrument not found.',
      );
    }

    if (dto.testId) {
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

    return this.prisma.labQualityControl.create({
      data: {
        instrumentId: dto.instrumentId,
        testId: dto.testId,
        performedAt: new Date(
          dto.performedAt,
        ),
        passed: dto.passed,
        notes: dto.notes,
      },

      include: {
        instrument: true,
        test: true,
      },
    });
  }

  async findAll(
    query: QueryLabQualityControlDto,
  ) {
    const {
      page,
      limit,
      instrumentId,
      testId,
    } = query;

    const where: Prisma.LabQualityControlWhereInput = {
      ...(instrumentId && {
        instrumentId,
      }),

      ...(testId && {
        testId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labQualityControl.findMany({
          where,

          include: {
            instrument: true,
            test: true,
          },

          orderBy: {
            performedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labQualityControl.count({
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
    const qualityControl =
      await this.prisma.labQualityControl.findUnique({
        where: {
          id,
        },

        include: {
          instrument: true,
          test: true,
        },
      });

    if (!qualityControl) {
      throw new NotFoundException(
        'Lab quality control not found.',
      );
    }

    return qualityControl;
  }

  async update(
    id: string,
    dto: UpdateLabQualityControlDto,
  ) {
    await this.findOne(id);

    if (dto.instrumentId) {
      const instrument =
        await this.prisma.laboratoryInstrument.findUnique({
          where: {
            id: dto.instrumentId,
          },
        });

      if (!instrument) {
        throw new NotFoundException(
          'Laboratory instrument not found.',
        );
      }
    }

    if (dto.testId) {
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

    return this.prisma.labQualityControl.update({
      where: {
        id,
      },

      data: {
        instrumentId: dto.instrumentId,
        testId: dto.testId,
        performedAt: dto.performedAt
          ? new Date(dto.performedAt)
          : undefined,
        passed: dto.passed,
        notes: dto.notes,
      },

      include: {
        instrument: true,
        test: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labQualityControl.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab quality control deleted successfully.',
    };
  }
}