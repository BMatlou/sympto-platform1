import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ReferralNotesController } from './referral-notes.controller';
import { ReferralNotesService } from './referral-notes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReferralNotesController],
  providers: [ReferralNotesService],
  exports: [ReferralNotesService],
})
export class ReferralNotesModule {}