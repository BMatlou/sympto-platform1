import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingReportsController } from './imaging-reports.controller';
import { ImagingReportsService } from './imaging-reports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingReportsController],
  providers: [ImagingReportsService],
  exports: [ImagingReportsService],
})
export class ImagingReportsModule {}