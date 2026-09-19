import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateNotificationDto,
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

    const preference =
      await this.prisma.notificationPreference.findUnique({
        where: {
          userId_notificationType_channel: {
            userId: dto.userId,
            notificationType: dto.type,
            channel: dto.channel,
          },
        },
        select: { enabled: true },
      });

    if (preference && !preference.enabled) {
      return {
        skipped: true,
        reason: 'NOTIFICATION_PREFERENCE_DISABLED',
      };
    }

    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        channel: dto.channel,
        status:
          dto.status,
        priority:
          dto.priority,
        actionUrl:
          dto.actionUrl,
        actionLabel:
          dto.actionLabel,
        scheduledFor:
          dto.scheduledFor
            ? new Date(
                dto.scheduledFor,
              )
            : undefined,
      },

      include: {
        user: true,
        deliveryLogs: true,
        preferences: true,
        notificationQueue: true,
      },
    });
  }

  async findAll(
    query: QueryNotificationDto,
  ) {
    const {
      page,
      limit,
      userId,
      type,
      status,
      channel,
      priority,
    } = query;

    const where: Prisma.NotificationWhereInput = {
      ...(userId && {
        userId,
      }),

      ...(type && {
        type,
      }),

      ...(status && {
        status,
      }),

      ...(channel && {
        channel,
      }),

      ...(priority && {
        priority,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.notification.findMany({
          where,

          include: {
            user: true,
            deliveryLogs: true,
            preferences: true,
            notificationQueue: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.notification.count({
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

  async findForUser(
    userId: string,
    page = 1,
    limit = 50,
    unreadOnly = false,
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          channel: true,
          status: true,
          priority: true,
          actionUrl: true,
          actionLabel: true,
          scheduledFor: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: [
          { readAt: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
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

  async markReadForUser(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true, readAt: true, status: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        readAt: new Date(),
        status: 'READ',
      },
      select: {
        id: true,
        readAt: true,
        status: true,
      },
    });
  }

  async markAllReadForUser(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        status: { in: ['SENT', 'DELIVERED', 'READ'] },
      },
      data: {
        readAt: new Date(),
        status: 'READ',
      },
    });

    return { updated: result.count };
  }

    async findOne(
    id: string,
  ) {
    const notification =
      await this.prisma.notification.findUnique({
        where: {
          id,
        },

        include: {
          user: true,

          deliveryLogs: {
            orderBy: {
              attemptedAt: 'desc',
            },
          },

          preferences: true,

          notificationQueue: true,
        },
      });

    if (!notification) {
      throw new NotFoundException(
        'Notification not found.',
      );
    }

    return notification;
  }

  async update(
    id: string,
    dto: UpdateNotificationDto,
  ) {
    const notification =
      await this.prisma.notification.findUnique({
        where: {
          id,
        },
      });

    if (!notification) {
      throw new NotFoundException(
        'Notification not found.',
      );
    }

    return this.prisma.notification.update({
      where: {
        id,
      },

      data: {
        ...(dto.userId !== undefined && {
          userId: dto.userId,
        }),

        ...(dto.type !== undefined && {
          type: dto.type,
        }),

        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.body !== undefined && {
          body: dto.body,
        }),

        ...(dto.channel !== undefined && {
          channel: dto.channel,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),

        ...(dto.priority !== undefined && {
          priority: dto.priority,
        }),

        ...(dto.actionUrl !== undefined && {
          actionUrl: dto.actionUrl,
        }),

        ...(dto.actionLabel !== undefined && {
          actionLabel: dto.actionLabel,
        }),

        ...(dto.scheduledFor !== undefined && {
          scheduledFor: dto.scheduledFor
            ? new Date(dto.scheduledFor)
            : null,
        }),
      },

      include: {
        user: true,
        deliveryLogs: true,
        preferences: true,
        notificationQueue: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const notification =
      await this.prisma.notification.findUnique({
        where: {
          id,
        },
      });

    if (!notification) {
      throw new NotFoundException(
        'Notification not found.',
      );
    }

    await this.prisma.notification.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Notification deleted successfully.',
    };
  }
}