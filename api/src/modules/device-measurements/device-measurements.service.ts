import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDeviceMeasurementDto } from './dto/create-device-measurement.dto';
import { UpdateDeviceMeasurementDto } from './dto/update-device-measurement.dto';
import { QueryDeviceMeasurementDto } from './dto/query-device-measurement.dto';

@Injectable()
export class DeviceMeasurementsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDeviceMeasurementDto,
  ) {
    const device =
      await this.prisma.wearableDevice.findUnique({
        where: {
          id: dto.deviceId,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Wearable device not found.',
      );
    }

    return this.prisma.deviceMeasurement.create({
      data: {
        ...dto,
      },

      include: {
        device: true,
        deviceAlerts: true,
      },
    });
  }

  async findAll(
    query: QueryDeviceMeasurementDto,
  ) {
    const {
      page,
      limit,
      deviceId,
      measurementType,
    } = query;

    const where: Prisma.DeviceMeasurementWhereInput = {
      ...(deviceId && {
        deviceId,
      }),

      ...(measurementType && {
        measurementType,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.deviceMeasurement.findMany({
          where,

          include: {
            device: true,
            deviceAlerts: true,
          },

          orderBy: {
            measuredAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.deviceMeasurement.count({
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
    const measurement =
      await this.prisma.deviceMeasurement.findUnique({
        where: {
          id,
        },

        include: {
          device: true,
          deviceAlerts: true,
        },
      });

    if (!measurement) {
      throw new NotFoundException(
        'Device measurement not found.',
      );
    }

    return measurement;
  }

  async update(
    id: string,
    dto: UpdateDeviceMeasurementDto,
  ) {
    const measurement =
      await this.prisma.deviceMeasurement.findUnique({
        where: {
          id,
        },
      });

    if (!measurement) {
      throw new NotFoundException(
        'Device measurement not found.',
      );
    }

    if (
      dto.deviceId &&
      dto.deviceId !== measurement.deviceId
    ) {
      const device =
        await this.prisma.wearableDevice.findUnique({
          where: {
            id: dto.deviceId,
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Wearable device not found.',
        );
      }
    }

    return this.prisma.deviceMeasurement.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        device: true,
        deviceAlerts: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const measurement =
      await this.prisma.deviceMeasurement.findUnique({
        where: {
          id,
        },
      });

    if (!measurement) {
      throw new NotFoundException(
        'Device measurement not found.',
      );
    }

    await this.prisma.deviceMeasurement.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Device measurement deleted successfully.',
    };
  }
}