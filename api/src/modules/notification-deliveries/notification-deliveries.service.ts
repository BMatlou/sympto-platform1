import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateNotificationDeliveryDto } from './dto/create-notification-delivery.dto';
import { UpdateNotificationDeliveryDto } from './dto/update-notification-delivery.dto';
import { QueryNotificationDeliveryDto } from './dto/query-notification-delivery.dto';

@Injectable()
export class NotificationDeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateNotificationDeliveryDto,
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

    return this.prisma.notificationDelivery.create({
      data: {
        notificationId: dto.notificationId,
        provider: dto.provider,
        providerReference:
          dto.providerReference,
        success: dto.success,
        errorMessage:
          dto.errorMessage,
      },

      include: {
        notification: true,
      },
    });
  }

  async findAll(
    query: QueryNotificationDeliveryDto,
  ) {
    const {
      page,
      limit,
      notificationId,
      success,
    } = query;

    const where: Prisma.NotificationDeliveryWhereInput =
      {
        ...(notificationId && {
          notificationId,
        }),

        ...(success !== undefined && {
          success,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.notificationDelivery.findMany({
          where,

          include: {
            notification: true,
          },

          orderBy: {
            attemptedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.notificationDelivery.count({
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
    const delivery =
      await this.prisma.notificationDelivery.findUnique({
        where: {
          id,
        },

        include: {
          notification: true,
        },
      });

    if (!delivery) {
      throw new NotFoundException(
        'Notification delivery not found.',
      );
    }

    return delivery;
  }

  async update(
    id: string,
    dto: UpdateNotificationDeliveryDto,
  ) {
    const delivery =
      await this.prisma.notificationDelivery.findUnique({
        where: {
          id,
        },
      });

    if (!delivery) {
      throw new NotFoundException(
        'Notification delivery not found.',
      );
    }

    return this.prisma.notificationDelivery.update({
      where: {
        id,
      },

      data: {
        ...(dto.notificationId !== undefined && {
          notificationId: dto.notificationId,
        }),

        ...(dto.provider !== undefined && {
          provider: dto.provider,
        }),

        ...(dto.providerReference !== undefined && {
          providerReference:
            dto.providerReference,
        }),

        ...(dto.success !== undefined && {
          success: dto.success,
        }),

        ...(dto.errorMessage !== undefined && {
          errorMessage:
            dto.errorMessage,
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
    const delivery =
      await this.prisma.notificationDelivery.findUnique({
        where: {
          id,
        },
      });

    if (!delivery) {
      throw new NotFoundException(
        'Notification delivery not found.',
      );
    }

    await this.prisma.notificationDelivery.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Notification delivery deleted successfully.',
    };
  }
}