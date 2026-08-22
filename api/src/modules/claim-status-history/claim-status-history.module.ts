import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClaimStatusHistoryController } from './claim-status-history.controller';
import { ClaimStatusHistoryService } from './claim-status-history.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    ClaimStatusHistoryController,
  ],
  providers: [
    ClaimStatusHistoryService,
  ],
  exports: [
    ClaimStatusHistoryService,
  ],
})
export class ClaimStatusHistoryModule {}