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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const where: Prisma.NotificationWhereInput = {
      userId,
      channel: 'IN_APP',
      status: { in: ['SENT', 'DELIVERED', 'READ'] },
      OR: [
        { scheduledFor: null },
        { scheduledFor: { lte: new Date() } },
      ],
      ...(unreadOnly
        ? { readAt: null }
        : {
            AND: [
              {
                OR: [
                  { readAt: null },
                  { readAt: { gte: thirtyDaysAgo } },
                ],
              },
            ],
          }),
    };

    try {
      const [data, total] = await Promise.all([
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
          orderBy: {
            createdAt: 'desc',
          },
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(`[NotificationsService] findForUser ORM read failed: ${message}`, stack);

      type PatientNotificationRow = {
        id: string;
        type: string;
        title: string;
        body: string;
        channel: string;
        status: string;
        priority: string;
        actionUrl: string | null;
        actionLabel: string | null;
        scheduledFor: Date | null;
        sentAt: Date | null;
        deliveredAt: Date | null;
        readAt: Date | null;
        createdAt: Date;
      };

      const rows = await this.prisma.$queryRaw<PatientNotificationRow[]>`
        SELECT
          "id",
          "type"::text AS "type",
          "title",
          "body",
          "channel"::text AS "channel",
          "status"::text AS "status",
          "priority"::text AS "priority",
          "actionUrl",
          "actionLabel",
          "scheduledFor",
          "sentAt",
          "deliveredAt",
          "readAt",
          "createdAt"
        FROM "Notification"
        WHERE "userId" = ${userId}
          AND "channel" = 'IN_APP'
          AND "status" IN ('SENT', 'DELIVERED', 'READ')
          AND ("scheduledFor" IS NULL OR "scheduledFor" <= NOW())
          ${unreadOnly
            ? Prisma.sql`AND "readAt" IS NULL`
            : Prisma.sql`AND ("readAt" IS NULL OR "readAt" >= NOW() - INTERVAL '30 days')`}
        ORDER BY "createdAt" DESC
        OFFSET ${(page - 1) * limit}
        LIMIT ${limit}
      `;

      const totalRows = await this.prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COUNT(*)::int AS "total"
        FROM "Notification"
        WHERE "userId" = ${userId}
          AND "channel" = 'IN_APP'
          AND "status" IN ('SENT', 'DELIVERED', 'READ')
          AND ("scheduledFor" IS NULL OR "scheduledFor" <= NOW())
          ${unreadOnly ? Prisma.sql`AND "readAt" IS NULL` : Prisma.empty}
      `;

      const total = Number(totalRows[0]?.total ?? 0);
      return {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
  }

  async getDueMedicationRemindersForUser(userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      channel: string;
      status: string;
      priority: string;
      actionUrl: string | null;
      actionLabel: string | null;
      scheduledFor: Date | null;
      sentAt: Date | null;
      deliveredAt: Date | null;
      readAt: Date | null;
      createdAt: Date;
    }>>`
      SELECT
        "id",
        "type"::text AS "type",
        "title",
        "body",
        "channel"::text AS "channel",
        "status"::text AS "status",
        "priority"::text AS "priority",
        "actionUrl",
        "actionLabel",
        "scheduledFor",
        "sentAt",
        "deliveredAt",
        "readAt",
        "createdAt"
      FROM "Notification"
      WHERE "userId" = ${userId}
        AND "type" = 'REMINDER'
        AND "channel" = 'IN_APP'
        AND "title" ILIKE 'Medication reminder:%'
        AND "status" IN ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ')
        AND (
          ("scheduledFor" IS NOT NULL
            AND "scheduledFor" BETWEEN NOW() - INTERVAL '2 minutes' AND NOW())
          OR
          ("sentAt" IS NOT NULL
            AND "sentAt" BETWEEN NOW() - INTERVAL '2 minutes' AND NOW())
          OR
          ("deliveredAt" IS NOT NULL
            AND "deliveredAt" BETWEEN NOW() - INTERVAL '2 minutes' AND NOW())
        )
      ORDER BY COALESCE("sentAt", "scheduledFor", "deliveredAt", "createdAt") DESC
      LIMIT 25
    `;

    return rows;
  }

  async getUnreadCountForUser(userId: string): Promise<number> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      channel: 'IN_APP',
      readAt: null,
      status: { in: ['SENT', 'DELIVERED'] },
      OR: [
        { scheduledFor: null },
        { scheduledFor: { lte: new Date() } },
      ],
    };

    try {
      return await this.prisma.notification.count({ where });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(`[NotificationsService] unread-count ORM read failed: ${message}`, stack);

      const rows = await this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS "count"
        FROM "Notification"
        WHERE "userId" = ${userId}
          AND "channel" = 'IN_APP'
          AND "readAt" IS NULL
          AND "status" IN ('SENT', 'DELIVERED')
          AND ("scheduledFor" IS NULL OR "scheduledFor" <= NOW())
      `;

      return Number(rows[0]?.count ?? 0);
    }
  }

  async markReadForUser(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, channel: 'IN_APP' },
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
        channel: 'IN_APP',
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