import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BillingModule } from '../billing/billing.module';

import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [
    DatabaseModule,
    BillingModule,
  ],
  controllers: [
    RefundsController,
  ],
  providers: [
    RefundsService,
  ],
  exports: [
    RefundsService,
  ],
})
export class RefundsModule {}