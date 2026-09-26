import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { NotificationProcessorService } from './notification-processor.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [NotificationProcessorService],
})
export class NotificationProcessorModule {}
