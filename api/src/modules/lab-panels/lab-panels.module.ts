import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabPanelsController } from './lab-panels.controller';
import { LabPanelsService } from './lab-panels.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabPanelsController],
  providers: [LabPanelsService],
  exports: [LabPanelsService],
})
export class LabPanelsModule {}