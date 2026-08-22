import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateWearableDeviceDto } from './dto/create-wearable-device.dto';
import { UpdateWearableDeviceDto } from './dto/update-wearable-device.dto';
import { QueryWearableDeviceDto } from './dto/query-wearable-device.dto';

@Injectable()
export class WearableDevicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateWearableDeviceDto,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    return this.prisma.wearableDevice.create({
      data: {
        ...dto,
      },

      include: {
        patient: true,
        measurements: true,
        alerts: true,
        syncLogs: true,
      },
    });
  }

  async findAll(
    query: QueryWearableDeviceDto,
  ) {
    const {
      page,
      limit,
      patientId,
      deviceType,
      status,
    } = query;

    const where: Prisma.WearableDeviceWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(deviceType && {
        deviceType,
      }),

      ...(status && {
        status,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.wearableDevice.findMany({
          where,

          include: {
            patient: true,
            measurements: true,
            alerts: true,
            syncLogs: true,
          },

          orderBy: {
            registeredAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.wearableDevice.count({
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
    const device =
      await this.prisma.wearableDevice.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          measurements: true,
          alerts: true,
          syncLogs: true,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Wearable device not found.',
      );
    }

    return device;
  }

  async update(
    id: string,
    dto: UpdateWearableDeviceDto,
  ) {
    const device =
      await this.prisma.wearableDevice.findUnique({
        where: {
          id,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Wearable device not found.',
      );
    }

    if (
      dto.patientId &&
      dto.patientId !== device.patientId
    ) {
      const patient =
        await this.prisma.patient.findUnique({
          where: {
            id: dto.patientId,
          },
        });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }
    }

    return this.prisma.wearableDevice.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        patient: true,
        measurements: true,
        alerts: true,
        syncLogs: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const device =
      await this.prisma.wearableDevice.findUnique({
        where: {
          id,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Wearable device not found.',
      );
    }

    await this.prisma.wearableDevice.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Wearable device deleted successfully.',
    };
  }
}