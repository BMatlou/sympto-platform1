import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { HealthGoalsModule } from '../health-goals/health-goals.module';

import { NotificationProcessorService } from './notification-processor.service';
import { MedicationReminderSchedulerService } from './medication-reminder-scheduler.service';
import { HealthReportNotificationSchedulerService } from './health-report-notification-scheduler.service';
import { HealthReportIntelligenceService } from './health-report-intelligence.service';
import { HealthReportController } from './health-report.controller';

@Module({
  imports: [DatabaseModule, NotificationsModule, HealthGoalsModule],
  controllers: [HealthReportController],
  providers: [
    NotificationProcessorService,
    MedicationReminderSchedulerService,
    HealthReportNotificationSchedulerService,
    HealthReportIntelligenceService,
  ],
  exports: [MedicationReminderSchedulerService],
})
export class NotificationProcessorModule {}
