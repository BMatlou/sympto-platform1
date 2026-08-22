import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BillingModule } from '../billing/billing.module';

import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';

@Module({
  imports: [
    DatabaseModule,
    BillingModule,
  ],
  controllers: [
    ReceiptsController,
  ],
  providers: [
    ReceiptsService,
  ],
  exports: [
    ReceiptsService,
  ],
})
export class ReceiptsModule {}