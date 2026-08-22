import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { NotificationDeliveriesController } from './notification-deliveries.controller';
import { NotificationDeliveriesService } from './notification-deliveries.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    NotificationDeliveriesController,
  ],
  providers: [
    NotificationDeliveriesService,
  ],
  exports: [
    NotificationDeliveriesService,
  ],
})
export class NotificationDeliveriesModule {}