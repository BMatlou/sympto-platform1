import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BillingModule } from '../billing/billing.module';

import { CreditNotesController } from './credit-notes.controller';
import { CreditNotesService } from './credit-notes.service';

@Module({
  imports: [
    DatabaseModule,
    BillingModule,
  ],
  controllers: [
    CreditNotesController,
  ],
  providers: [
    CreditNotesService,
  ],
  exports: [
    CreditNotesService,
  ],
})
export class CreditNotesModule {}