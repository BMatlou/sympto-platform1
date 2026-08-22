import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { NotificationQueueController } from './notification-queue.controller';
import { NotificationQueueService } from './notification-queue.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    NotificationQueueController,
  ],
  providers: [
    NotificationQueueService,
  ],
  exports: [
    NotificationQueueService,
  ],
})
export class NotificationQueueModule {}