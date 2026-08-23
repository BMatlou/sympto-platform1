import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

/**
 * Processes due notifications created by the notification queue.
 *
 * The first delivery path is the in-app notification inbox. External
 * providers (push/SMS/email/WhatsApp) can be added behind this service
 * without changing the scheduling contract.
 */
@Injectable()
export class NotificationProcessorService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationProcessorService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Run immediately on boot, then poll every 15 seconds.
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
      const dueItems = await this.prisma.notificationQueue.findMany({
        where: {
          scheduledFor: { lte: new Date() },
        },
        include: {
          notification: true,
        },
        orderBy: { scheduledFor: 'asc' },
        take: 50,
      });

      for (const item of dueItems) {
        try {
          await this.deliverInApp(item.notificationId);
        } catch (error) {
          await this.recordFailure(item.id, item.notificationId, error);
        }
      }
    } finally {
      this.processing = false;
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

    // The notification record itself is the user's in-app inbox item.
    // Mark it as sent only after it has become available to the user.
    await this.prisma.$transaction([
      this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'SENT' as any,
          scheduledFor: null,
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

  private async recordFailure(
    queueId: string,
    notificationId: string,
    error: unknown,
  ) {
    const message =
      error instanceof Error ? error.message : 'Unknown delivery error';

    await this.prisma.$transaction([
      this.prisma.notificationDelivery.create({
        data: {
          notificationId,
          provider: 'IN_APP',
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
      `Notification ${notificationId} delivery failed: ${message}`,
    );
  }
}
