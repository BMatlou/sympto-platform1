import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BillingModule } from '../billing/billing.module';

import { FinancialAdjustmentsController } from './financial-adjustments.controller';
import { FinancialAdjustmentsService } from './financial-adjustments.service';

@Module({
  imports: [
    DatabaseModule,
    BillingModule,
  ],
  controllers: [
    FinancialAdjustmentsController,
  ],
  providers: [
    FinancialAdjustmentsService,
  ],
  exports: [
    FinancialAdjustmentsService,
  ],
})
export class FinancialAdjustmentsModule {}