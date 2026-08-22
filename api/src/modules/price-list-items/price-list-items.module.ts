import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PriceListItemsController } from './price-list-items.controller';
import { PriceListItemsService } from './price-list-items.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PriceListItemsController],
  providers: [PriceListItemsService],
  exports: [PriceListItemsService],
})
export class PriceListItemsModule {}