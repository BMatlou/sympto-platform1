import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ReferralFeedbackController } from './referral-feedback.controller';
import { ReferralFeedbackService } from './referral-feedback.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReferralFeedbackController],
  providers: [ReferralFeedbackService],
  exports: [ReferralFeedbackService],
})
export class ReferralFeedbackModule {}