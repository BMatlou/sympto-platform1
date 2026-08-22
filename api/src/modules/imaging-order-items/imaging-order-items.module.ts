import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingOrderItemsController } from './imaging-order-items.controller';
import { ImagingOrderItemsService } from './imaging-order-items.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingOrderItemsController],
  providers: [ImagingOrderItemsService],
  exports: [ImagingOrderItemsService],
})
export class ImagingOrderItemsModule {}