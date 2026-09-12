import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsModule } from '../health-goals/health-goals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationQueueModule } from '../notification-queue/notification-queue.module';

import { PatientMedicationsController } from './patient-medications.controller';
import { PatientMedicationsService } from './patient-medications.service';

@Module({
  imports: [DatabaseModule, HealthGoalsModule, NotificationsModule, NotificationQueueModule],
  controllers: [PatientMedicationsController],
  providers: [PatientMedicationsService],
  exports: [PatientMedicationsService],
})
export class PatientMedicationsModule {}
