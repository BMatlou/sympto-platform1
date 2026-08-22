import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateNotificationPreferenceDto } from './dto/create-notification-preference.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { QueryNotificationPreferenceDto } from './dto/query-notification-preference.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateNotificationPreferenceDto,
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

    if (dto.notificationId) {
      const notification =
        await this.prisma.notification.findUnique({
          where: {
            id: dto.notificationId,
          },
        });

      if (!notification) {
        throw new NotFoundException(
          'Notification not found.',
        );
      }
    }

    const existing =
      await this.prisma.notificationPreference.findUnique({
        where: {
          userId_notificationType_channel: {
            userId: dto.userId,
            notificationType:
              dto.notificationType,
            channel: dto.channel,
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'Notification preference already exists.',
      );
    }

    return this.prisma.notificationPreference.create({
      data: {
        userId: dto.userId,
        notificationType:
          dto.notificationType,
        channel: dto.channel,
        enabled:
          dto.enabled ?? true,
        quietHoursStart:
          dto.quietHoursStart,
        quietHoursEnd:
          dto.quietHoursEnd,
        notificationId:
          dto.notificationId,
      },

      include: {
        user: true,
        notification: true,
      },
    });
  }

  async findAll(
    query: QueryNotificationPreferenceDto,
  ) {
    const {
      page,
      limit,
      userId,
      notificationId,
      notificationType,
      channel,
    } = query;

    const where: Prisma.NotificationPreferenceWhereInput =
      {
        ...(userId && {
          userId,
        }),

        ...(notificationId && {
          notificationId,
        }),

        ...(notificationType && {
          notificationType,
        }),

        ...(channel && {
          channel,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.notificationPreference.findMany({
          where,

          include: {
            user: true,
            notification: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.notificationPreference.count({
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
    const preference =
      await this.prisma.notificationPreference.findUnique({
        where: {
          id,
        },

        include: {
          user: true,
          notification: true,
        },
      });

    if (!preference) {
      throw new NotFoundException(
        'Notification preference not found.',
      );
    }

    return preference;
  }

  async update(
    id: string,
    dto: UpdateNotificationPreferenceDto,
  ) {
    const preference =
      await this.prisma.notificationPreference.findUnique({
        where: {
          id,
        },
      });

    if (!preference) {
      throw new NotFoundException(
        'Notification preference not found.',
      );
    }

    return this.prisma.notificationPreference.update({
      where: {
        id,
      },

      data: {
        ...(dto.userId !== undefined && {
          userId: dto.userId,
        }),

        ...(dto.notificationType !== undefined && {
          notificationType:
            dto.notificationType,
        }),

        ...(dto.channel !== undefined && {
          channel: dto.channel,
        }),

        ...(dto.enabled !== undefined && {
          enabled: dto.enabled,
        }),

        ...(dto.quietHoursStart !== undefined && {
          quietHoursStart:
            dto.quietHoursStart,
        }),

        ...(dto.quietHoursEnd !== undefined && {
          quietHoursEnd:
            dto.quietHoursEnd,
        }),

        ...(dto.notificationId !== undefined && {
          notificationId:
            dto.notificationId,
        }),
      },

      include: {
        user: true,
        notification: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const preference =
      await this.prisma.notificationPreference.findUnique({
        where: {
          id,
        },
      });

    if (!preference) {
      throw new NotFoundException(
        'Notification preference not found.',
      );
    }

    await this.prisma.notificationPreference.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Notification preference deleted successfully.',
    };
  }
}