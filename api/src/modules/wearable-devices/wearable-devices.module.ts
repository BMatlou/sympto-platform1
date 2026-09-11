import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { WearableDevicesController } from './wearable-devices.controller';
import { WearableDevicesService } from './wearable-devices.service';
import { PatientWearablesController } from '../patient-wearables/patient-wearables.controller';
import { PatientWearablesService } from '../patient-wearables/patient-wearables.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    WearableDevicesController,
    PatientWearablesController,
  ],

  providers: [
    WearableDevicesService,
    PatientWearablesService,
  ],

  exports: [
    WearableDevicesService,
    PatientWearablesService,
  ],
})
export class WearableDevicesModule {}