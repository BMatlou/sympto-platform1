import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabPanelItemsController } from './lab-panel-items.controller';
import { LabPanelItemsService } from './lab-panel-items.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabPanelItemsController],
  providers: [LabPanelItemsService],
  exports: [LabPanelItemsService],
})
export class LabPanelItemsModule {}