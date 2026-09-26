import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { DeviceMeasurementsModule } from '../device-measurements/device-measurements.module';
import { HealthGoalsModule } from '../health-goals/health-goals.module';

import { WearableDevicesController } from './wearable-devices.controller';
import { WearableDevicesService } from './wearable-devices.service';
import { PatientWearablesController } from '../patient-wearables/patient-wearables.controller';
import { PatientWearablesService } from '../patient-wearables/patient-wearables.service';

@Module({
  imports: [
    DatabaseModule,
    DeviceMeasurementsModule,
    HealthGoalsModule,
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