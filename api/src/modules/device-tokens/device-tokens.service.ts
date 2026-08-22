import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDeviceTokenDto } from './dto/create-device-token.dto';
import { QueryDeviceTokenDto } from './dto/query-device-token.dto';
import { UpdateDeviceTokenDto } from './dto/update-device-token.dto';

@Injectable()
export class DeviceTokensService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDeviceTokenDto,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: dto.userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    const existing =
      await this.prisma.deviceToken.findUnique({
        where: {
          token: dto.token,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Device token already exists.',
      );
    }

    return this.prisma.deviceToken.create({
      data: {
        userId: dto.userId,
        token: dto.token,
        platform: dto.platform,
        deviceName: dto.deviceName,
        active:
          dto.active ?? true,
      },

      include: {
        user: true,
      },
    });
  }

  async findAll(
    query: QueryDeviceTokenDto,
  ) {
    const {
      page,
      limit,
      userId,
      platform,
      active,
    } = query;

    const where: Prisma.DeviceTokenWhereInput =
      {
        ...(userId && {
          userId,
        }),

        ...(platform && {
          platform: {
            contains: platform,
            mode: 'insensitive',
          },
        }),

        ...(active !== undefined && {
          active,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.deviceToken.findMany({
          where,

          include: {
            user: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.deviceToken.count({
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
    const deviceToken =
      await this.prisma.deviceToken.findUnique({
        where: {
          id,
        },

        include: {
          user: true,
        },
      });

    if (!deviceToken) {
      throw new NotFoundException(
        'Device token not found.',
      );
    }

    return deviceToken;
  }

  async update(
    id: string,
    dto: UpdateDeviceTokenDto,
  ) {
    const deviceToken =
      await this.prisma.deviceToken.findUnique({
        where: {
          id,
        },
      });

    if (!deviceToken) {
      throw new NotFoundException(
        'Device token not found.',
      );
    }

    if (
      dto.token &&
      dto.token !== deviceToken.token
    ) {
      const existing =
        await this.prisma.deviceToken.findUnique({
          where: {
            token: dto.token,
          },
        });

      if (existing) {
        throw new ConflictException(
          'Device token already exists.',
        );
      }
    }

    return this.prisma.deviceToken.update({
      where: {
        id,
      },

      data: {
        ...(dto.userId !== undefined && {
          userId: dto.userId,
        }),

        ...(dto.token !== undefined && {
          token: dto.token,
        }),

        ...(dto.platform !== undefined && {
          platform: dto.platform,
        }),

        ...(dto.deviceName !== undefined && {
          deviceName: dto.deviceName,
        }),

        ...(dto.active !== undefined && {
          active: dto.active,
        }),
      },

      include: {
        user: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const deviceToken =
      await this.prisma.deviceToken.findUnique({
        where: {
          id,
        },
      });

    if (!deviceToken) {
      throw new NotFoundException(
        'Device token not found.',
      );
    }

    await this.prisma.deviceToken.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Device token deleted successfully.',
    };
  }
}