import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingStudiesController } from './imaging-studies.controller';
import { ImagingStudiesService } from './imaging-studies.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingStudiesController],
  providers: [ImagingStudiesService],
  exports: [ImagingStudiesService],
})
export class ImagingStudiesModule {}