import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabCalibrationsController } from './lab-calibrations.controller';
import { LabCalibrationsService } from './lab-calibrations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabCalibrationsController],
  providers: [LabCalibrationsService],
  exports: [LabCalibrationsService],
})
export class LabCalibrationsModule {}