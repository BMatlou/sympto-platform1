import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { NotificationsController } from './notifications.controller';
import { PatientNotificationsController } from './patient-notifications.controller';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';

@Module({
  imports: [DatabaseModule, NotificationPreferencesModule],
  controllers: [NotificationsController, PatientNotificationsController],
  providers: [NotificationsService, PushNotificationService],
  exports: [NotificationsService, PushNotificationService],
})
export class NotificationsModule {}