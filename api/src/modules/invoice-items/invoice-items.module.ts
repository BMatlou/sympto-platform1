import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { InvoiceItemsController } from './invoice-items.controller';
import { InvoiceItemsService } from './invoice-items.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InvoiceItemsController],
  providers: [InvoiceItemsService],
  exports: [InvoiceItemsService],
})
export class InvoiceItemsModule {}