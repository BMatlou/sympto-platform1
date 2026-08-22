import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClaimPaymentsController } from './claim-payments.controller';
import { ClaimPaymentsService } from './claim-payments.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    ClaimPaymentsController,
  ],
  providers: [
    ClaimPaymentsService,
  ],
  exports: [
    ClaimPaymentsService,
  ],
})
export class ClaimPaymentsModule {}