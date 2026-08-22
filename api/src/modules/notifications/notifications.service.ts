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