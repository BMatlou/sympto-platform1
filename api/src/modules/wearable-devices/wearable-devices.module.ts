import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { WearableDevicesController } from './wearable-devices.controller';
import { WearableDevicesService } from './wearable-devices.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    WearableDevicesController,
  ],

  providers: [
    WearableDevicesService,
  ],

  exports: [
    WearableDevicesService,
  ],
})
export class WearableDevicesModule {}