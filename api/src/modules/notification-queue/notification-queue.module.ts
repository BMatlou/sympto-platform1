import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { NotificationQueueController } from './notification-queue.controller';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationProcessorService } from '../notification-processor/notification-processor.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    NotificationQueueController,
  ],
  providers: [
    NotificationQueueService,
    NotificationProcessorService,
  ],
  exports: [
    NotificationQueueService,
  ],
})
export class NotificationQueueModule {}