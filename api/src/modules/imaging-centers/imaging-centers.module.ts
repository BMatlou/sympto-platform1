import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingCentersController } from './imaging-centers.controller';
import { ImagingCentersService } from './imaging-centers.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingCentersController],
  providers: [ImagingCentersService],
  exports: [ImagingCentersService],
})
export class ImagingCentersModule {}