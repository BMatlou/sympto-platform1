import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabOrderItemsController } from './lab-order-items.controller';
import { LabOrderItemsService } from './lab-order-items.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabOrderItemsController],
  providers: [LabOrderItemsService],
  exports: [LabOrderItemsService],
})
export class LabOrderItemsModule {}