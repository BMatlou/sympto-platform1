import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDeviceSyncLogDto } from './dto/create-device-sync-log.dto';
import { QueryDeviceSyncLogDto } from './dto/query-device-sync-log.dto';

@Injectable()
export class DeviceSyncLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDeviceSyncLogDto,
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

    return this.prisma.deviceSyncLog.create({
      data: {
        recordsImported:
          dto.recordsImported ?? 0,

        ...dto,
      },

      include: {
        device: true,
      },
    });
  }

  async findAll(
    query: QueryDeviceSyncLogDto,
  ) {
    const {
      page,
      limit,
      deviceId,
      success,
    } = query;

    const where: Prisma.DeviceSyncLogWhereInput = {
      ...(deviceId && {
        deviceId,
      }),

      ...(success !== undefined && {
        success,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.deviceSyncLog.findMany({
          where,

          include: {
            device: true,
          },

          orderBy: {
            syncStartedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.deviceSyncLog.count({
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
    const syncLog =
      await this.prisma.deviceSyncLog.findUnique({
        where: {
          id,
        },

        include: {
          device: true,
        },
      });

    if (!syncLog) {
      throw new NotFoundException(
        'Device sync log not found.',
      );
    }

    return syncLog;
  }
}