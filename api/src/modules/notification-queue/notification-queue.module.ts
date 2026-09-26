import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { NotificationProcessorModule } from '../notification-processor/notification-processor.module';

import { NotificationQueueController } from './notification-queue.controller';
import { NotificationQueueService } from './notification-queue.service';

@Module({
  imports: [DatabaseModule, NotificationProcessorModule],
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