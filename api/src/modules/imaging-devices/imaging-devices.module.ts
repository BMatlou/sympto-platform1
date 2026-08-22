import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingDevicesController } from './imaging-devices.controller';
import { ImagingDevicesService } from './imaging-devices.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingDevicesController],
  providers: [ImagingDevicesService],
  exports: [ImagingDevicesService],
})
export class ImagingDevicesModule {}