import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationQueueWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.processDue();
    this.timer = setInterval(() => void this.processDue(), 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async processDue() {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.prisma.notificationQueue.findMany({
        where: { scheduledFor: { lte: new Date() }, notification: { status: 'PENDING' as any } },
        include: { notification: true },
        orderBy: { scheduledFor: 'asc' },
        take: 100,
      });

      for (const item of due) {
        const claimed = await this.prisma.notification.updateMany({
          where: { id: item.notificationId, status: 'PENDING' as any },
          data: { status: 'SENT' as any },
        });
        if (claimed.count !== 1) continue;

        await this.prisma.notificationDelivery.create({
          data: {
            notificationId: item.notificationId,
            provider: item.notification.channel,
            success: true,
            providerReference: 'local-intervention-worker',
          },
        });
        await this.prisma.notificationQueue.delete({ where: { id: item.id } });
      }
      if (due.length) this.logger.log(`Processed ${due.length} due notification(s)`);
    } catch (error) {
      this.logger.error('Notification delivery worker failed', error);
    } finally {
      this.running = false;
    }
  }
}
