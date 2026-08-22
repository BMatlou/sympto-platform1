import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DeviceMeasurementsController } from './device-measurements.controller';
import { DeviceMeasurementsService } from './device-measurements.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    DeviceMeasurementsController,
  ],

  providers: [
    DeviceMeasurementsService,
  ],

  exports: [
    DeviceMeasurementsService,
  ],
})
export class DeviceMeasurementsModule {}