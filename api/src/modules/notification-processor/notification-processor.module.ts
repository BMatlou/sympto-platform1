import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { NotificationProcessorService } from './notification-processor.service';
import { MedicationReminderSchedulerService } from './medication-reminder-scheduler.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [NotificationProcessorService, MedicationReminderSchedulerService],
  exports: [MedicationReminderSchedulerService],
})
export class NotificationProcessorModule {}
