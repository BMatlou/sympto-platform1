import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateNotificationQueueDto } from './dto/create-notification-queue.dto';
import { QueryNotificationQueueDto } from './dto/query-notification-queue.dto';
import { UpdateNotificationQueueDto } from './dto/update-notification-queue.dto';

@Injectable()
export class NotificationQueueService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateNotificationQueueDto,
  ) {
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

    const existing =
      await this.prisma.notificationQueue.findUnique({
        where: {
          notificationId:
            dto.notificationId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Notification already exists in the queue.',
      );
    }

    return this.prisma.notificationQueue.create({
      data: {
        notificationId:
          dto.notificationId,
        scheduledFor:
          new Date(
            dto.scheduledFor,
          ),
        attempts:
          dto.attempts ?? 0,
        lastAttempt:
          dto.lastAttempt
            ? new Date(
                dto.lastAttempt,
              )
            : undefined,
        nextAttempt:
          dto.nextAttempt
            ? new Date(
                dto.nextAttempt,
              )
            : undefined,
      },

      include: {
        notification: true,
      },
    });
  }

  async findAll(
    query: QueryNotificationQueueDto,
  ) {
    const {
      page,
      limit,
      notificationId,
    } = query;

    const where: Prisma.NotificationQueueWhereInput =
      {
        ...(notificationId && {
          notificationId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.notificationQueue.findMany({
          where,

          include: {
            notification: true,
          },

          orderBy: {
            scheduledFor:
              'asc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.notificationQueue.count({
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
    const queueItem =
      await this.prisma.notificationQueue.findUnique({
        where: {
          id,
        },

        include: {
          notification: true,
        },
      });

    if (!queueItem) {
      throw new NotFoundException(
        'Notification queue item not found.',
      );
    }

    return queueItem;
  }

  async update(
    id: string,
    dto: UpdateNotificationQueueDto,
  ) {
    const queueItem =
      await this.prisma.notificationQueue.findUnique({
        where: {
          id,
        },
      });

    if (!queueItem) {
      throw new NotFoundException(
        'Notification queue item not found.',
      );
    }

    return this.prisma.notificationQueue.update({
      where: {
        id,
      },

      data: {
        ...(dto.notificationId !== undefined && {
          notificationId:
            dto.notificationId,
        }),

        ...(dto.scheduledFor !== undefined && {
          scheduledFor: new Date(
            dto.scheduledFor,
          ),
        }),

        ...(dto.attempts !== undefined && {
          attempts: dto.attempts,
        }),

        ...(dto.lastAttempt !== undefined && {
          lastAttempt: dto.lastAttempt
            ? new Date(
                dto.lastAttempt,
              )
            : null,
        }),

        ...(dto.nextAttempt !== undefined && {
          nextAttempt: dto.nextAttempt
            ? new Date(
                dto.nextAttempt,
              )
            : null,
        }),
      },

      include: {
        notification: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const queueItem =
      await this.prisma.notificationQueue.findUnique({
        where: {
          id,
        },
      });

    if (!queueItem) {
      throw new NotFoundException(
        'Notification queue item not found.',
      );
    }

    await this.prisma.notificationQueue.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Notification queue item deleted successfully.',
    };
  }
}