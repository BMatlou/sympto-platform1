import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingOrdersController } from './imaging-orders.controller';
import { ImagingOrdersService } from './imaging-orders.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingOrdersController],
  providers: [ImagingOrdersService],
  exports: [ImagingOrdersService],
})
export class ImagingOrdersModule {}