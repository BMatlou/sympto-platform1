import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { InvoiceHistoryController } from './invoice-history.controller';
import { InvoiceHistoryService } from './invoice-history.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InvoiceHistoryController],
  providers: [InvoiceHistoryService],
  exports: [InvoiceHistoryService],
})
export class InvoiceHistoryModule {}