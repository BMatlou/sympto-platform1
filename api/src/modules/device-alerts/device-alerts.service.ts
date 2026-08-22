import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDeviceAlertDto } from './dto/create-device-alert.dto';
import { UpdateDeviceAlertDto } from './dto/update-device-alert.dto';
import { QueryDeviceAlertDto } from './dto/query-device-alert.dto';

@Injectable()
export class DeviceAlertsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDeviceAlertDto,
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

    if (dto.measurementId) {
      const measurement =
        await this.prisma.deviceMeasurement.findUnique({
          where: {
            id: dto.measurementId,
          },
        });

      if (!measurement) {
        throw new NotFoundException(
          'Device measurement not found.',
        );
      }
    }

    return this.prisma.deviceAlert.create({
      data: {
        ...dto,
      },

      include: {
        device: true,
        measurement: true,
      },
    });
  }

  async findAll(
    query: QueryDeviceAlertDto,
  ) {
    const {
      page,
      limit,
      deviceId,
      measurementId,
      severity,
      acknowledged,
    } = query;

    const where: Prisma.DeviceAlertWhereInput = {
      ...(deviceId && { deviceId }),
      ...(measurementId && { measurementId }),
      ...(severity && { severity }),
      ...(acknowledged !== undefined && {
        acknowledged,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.deviceAlert.findMany({
          where,

          include: {
            device: true,
            measurement: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.deviceAlert.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

    async findOne(
    id: string,
  ) {
    const alert =
      await this.prisma.deviceAlert.findUnique({
        where: {
          id,
        },

        include: {
          device: true,
          measurement: true,
        },
      });

    if (!alert) {
      throw new NotFoundException(
        'Device alert not found.',
      );
    }

    return alert;
  }

  async update(
    id: string,
    dto: UpdateDeviceAlertDto,
  ) {
    const alert =
      await this.prisma.deviceAlert.findUnique({
        where: {
          id,
        },
      });

    if (!alert) {
      throw new NotFoundException(
        'Device alert not found.',
      );
    }

    if (
      dto.deviceId &&
      dto.deviceId !== alert.deviceId
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

    if (
      dto.measurementId &&
      dto.measurementId !== alert.measurementId
    ) {
      const measurement =
        await this.prisma.deviceMeasurement.findUnique({
          where: {
            id: dto.measurementId,
          },
        });

      if (!measurement) {
        throw new NotFoundException(
          'Device measurement not found.',
        );
      }
    }

    return this.prisma.deviceAlert.update({
      where: {
        id,
      },

      data: {
        ...dto,

        ...(dto.acknowledged !== undefined && {
          acknowledgedAt: dto.acknowledged
            ? dto.acknowledgedAt ?? new Date()
            : null,
        }),
      },

      include: {
        device: true,
        measurement: true,
      },
    });
  }
}