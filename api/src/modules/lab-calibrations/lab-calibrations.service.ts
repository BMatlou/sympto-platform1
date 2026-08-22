import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabCalibrationDto } from './dto/create-lab-calibration.dto';
import { UpdateLabCalibrationDto } from './dto/update-lab-calibration.dto';
import { QueryLabCalibrationDto } from './dto/query-lab-calibration.dto';

@Injectable()
export class LabCalibrationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabCalibrationDto,
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

    if (dto.performedById) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.performedById,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    return this.prisma.labCalibration.create({
      data: {
        instrumentId: dto.instrumentId,
        performedById: dto.performedById,
        calibrationDate: new Date(
          dto.calibrationDate,
        ),
        nextCalibration: dto.nextCalibration
          ? new Date(dto.nextCalibration)
          : undefined,
        passed: dto.passed,
        notes: dto.notes,
      },

      include: {
        instrument: true,
        performedBy: true,
      },
    });
  }

  async findAll(
    query: QueryLabCalibrationDto,
  ) {
    const {
      page,
      limit,
      instrumentId,
      performedById,
    } = query;

    const where: Prisma.LabCalibrationWhereInput = {
      ...(instrumentId && {
        instrumentId,
      }),

      ...(performedById && {
        performedById,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labCalibration.findMany({
          where,

          include: {
            instrument: true,
            performedBy: true,
          },

          orderBy: {
            calibrationDate: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labCalibration.count({
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
    const calibration =
      await this.prisma.labCalibration.findUnique({
        where: {
          id,
        },

        include: {
          instrument: true,
          performedBy: true,
        },
      });

    if (!calibration) {
      throw new NotFoundException(
        'Lab calibration not found.',
      );
    }

    return calibration;
  }

  async update(
    id: string,
    dto: UpdateLabCalibrationDto,
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

    if (dto.performedById) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.performedById,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    return this.prisma.labCalibration.update({
      where: {
        id,
      },

      data: {
        instrumentId: dto.instrumentId,
        performedById: dto.performedById,
        calibrationDate: dto.calibrationDate
          ? new Date(dto.calibrationDate)
          : undefined,
        nextCalibration: dto.nextCalibration
          ? new Date(dto.nextCalibration)
          : undefined,
        passed: dto.passed,
        notes: dto.notes,
      },

      include: {
        instrument: true,
        performedBy: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labCalibration.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab calibration deleted successfully.',
    };
  }
}