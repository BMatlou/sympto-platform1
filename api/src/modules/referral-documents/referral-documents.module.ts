import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ReferralDocumentsController } from './referral-documents.controller';
import { ReferralDocumentsService } from './referral-documents.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReferralDocumentsController],
  providers: [ReferralDocumentsService],
  exports: [ReferralDocumentsService],
})
export class ReferralDocumentsModule {}