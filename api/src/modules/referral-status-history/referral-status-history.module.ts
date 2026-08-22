import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ReferralStatusHistoryController } from './referral-status-history.controller';
import { ReferralStatusHistoryService } from './referral-status-history.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReferralStatusHistoryController],
  providers: [ReferralStatusHistoryService],
  exports: [ReferralStatusHistoryService],
})
export class ReferralStatusHistoryModule {}