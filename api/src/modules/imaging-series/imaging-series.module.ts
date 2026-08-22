import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingSeriesController } from './imaging-series.controller';
import { ImagingSeriesService } from './imaging-series.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingSeriesController],
  providers: [ImagingSeriesService],
  exports: [ImagingSeriesService],
})
export class ImagingSeriesModule {}