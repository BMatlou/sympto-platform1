import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushNotificationService } from '../notifications/push-notification.service';

/**
 * Processes due notifications created by the notification queue.
 *
 * In-app and web push are currently supported delivery channels.
 * Additional providers can be added without changing the scheduling contract.
 */
@Injectable()
export class NotificationProcessorService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationProcessorService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  onModuleInit() {
    void this.processDueNotifications();
    this.timer = setInterval(() => {
      void this.processDueNotifications();
    }, 15_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async processDueNotifications() {
    if (this.processing) return;
    this.processing = true;

    try {
      const now = new Date();

      const dueItems = await this.prisma.notificationQueue.findMany({
        where: {
          scheduledFor: { lte: now },
          AND: [
            {
              OR: [
                { nextAttempt: null },
                { nextAttempt: { lte: now } },
              ],
            },
            {
              notification: {
                status: { in: ['PENDING', 'QUEUED'] },
              },
            },
          ],
          attempts: { lt: 5 },
        },
        include: {
          notification: true,
        },
        orderBy: { scheduledFor: 'asc' },
        take: 50,
      });

      for (const item of dueItems) {
        try {
          await this.deliverNotification(item.notification);
        } catch (error) {
          await this.recordFailure(item.id, item.notification, error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async deliverNotification(notification: {
    id: string;
    userId: string;
    type: any;
    title: string;
    body: string;
    channel: any;
    status: any;
    priority: any;
    actionUrl: string | null;
    actionLabel: string | null;
  }) {
    switch (String(notification.channel).toUpperCase()) {
      case 'IN_APP':
        await this.deliverInApp(notification.id);
        return;

      case 'PUSH':
        await this.deliverPush(notification);
        return;

      default:
        throw new Error(
          `UNSUPPORTED_NOTIFICATION_CHANNEL: ${String(notification.channel)}`,
        );
    }
  }

  private async deliverInApp(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      await this.prisma.notificationQueue.deleteMany({
        where: { notificationId },
      });
      return;
    }

    await this.prisma.$transaction([
      this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'SENT' as any,
          scheduledFor: null,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      }),
      this.prisma.notificationDelivery.create({
        data: {
          notificationId,
          provider: 'IN_APP',
          success: true,
        },
      }),
      this.prisma.notificationQueue.deleteMany({
        where: { notificationId },
      }),
    ]);

    this.logger.log(
      `Delivered in-app notification ${notificationId}`,
    );
  }

  private async deliverPush(notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    priority: string;
    actionUrl?: string | null;
    actionLabel?: string | null;
  }) {
    const result = await this.pushNotificationService.send(notification);

    await this.prisma.$transaction([
      this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'SENT' as any,
          scheduledFor: null,
          sentAt: new Date(),
          deliveredAt: null,
        },
      }),
      this.prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          provider: 'WEB_PUSH',
          providerReference: `web-push:${result.sent}`,
          success: true,
        },
      }),
      this.prisma.notificationQueue.deleteMany({
        where: { notificationId: notification.id },
      }),
    ]);

    this.logger.log(
      `Delivered web push notification ${notification.id} to ${result.sent} subscription(s)`,
    );
  }

  private async recordFailure(
    queueId: string,
    notification: {
      id: string;
      channel: any;
    },
    error: unknown,
  ) {
    const message =
      error instanceof Error ? error.message : 'Unknown delivery error';

    const queueItem = await this.prisma.notificationQueue.findUnique({
      where: { id: queueId },
      select: { attempts: true },
    });

    const nextAttemptCount = (queueItem?.attempts ?? 0) + 1;
    const provider =
      String(notification.channel).toUpperCase() === 'PUSH'
        ? 'WEB_PUSH'
        : 'IN_APP';

    if (nextAttemptCount >= 5) {
      await this.prisma.$transaction([
        this.prisma.notificationDelivery.create({
          data: {
            notificationId: notification.id,
            provider,
            success: false,
            errorMessage: message,
          },
        }),
        this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED' as any,
            scheduledFor: null,
          },
        }),
        this.prisma.notificationQueue.delete({
          where: { id: queueId },
        }),
      ]);

      this.logger.error(
        `Notification ${notification.id} failed permanently after ${nextAttemptCount} attempts: ${message}`,
      );
      return;
    }

    await this.prisma.$transaction([
      this.prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          provider,
          success: false,
          errorMessage: message,
        },
      }),
      this.prisma.notificationQueue.update({
        where: { id: queueId },
        data: {
          attempts: { increment: 1 },
          lastAttempt: new Date(),
          nextAttempt: new Date(Date.now() + 60_000),
        },
      }),
    ]);

    this.logger.error(
      `Notification ${notification.id} delivery failed (attempt ${nextAttemptCount}/5): ${message}`,
    );
  }
}
