import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DeviceAlertsController } from './device-alerts.controller';
import { DeviceAlertsService } from './device-alerts.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    DeviceAlertsController,
  ],

  providers: [
    DeviceAlertsService,
  ],

  exports: [
    DeviceAlertsService,
  ],
})
export class DeviceAlertsModule {}