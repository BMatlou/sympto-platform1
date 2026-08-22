import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BillingModule } from '../billing/billing.module';

import { DebitNotesController } from './debit-notes.controller';
import { DebitNotesService } from './debit-notes.service';

@Module({
  imports: [
    DatabaseModule,
    BillingModule,
  ],
  controllers: [
    DebitNotesController,
  ],
  providers: [
    DebitNotesService,
  ],
  exports: [
    DebitNotesService,
  ],
})
export class DebitNotesModule {}