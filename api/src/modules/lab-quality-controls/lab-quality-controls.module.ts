import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabQualityControlsController } from './lab-quality-controls.controller';
import { LabQualityControlsService } from './lab-quality-controls.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabQualityControlsController],
  providers: [LabQualityControlsService],
  exports: [LabQualityControlsService],
})
export class LabQualityControlsModule {}