import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthHomeController } from './health-home.controller';
import { HealthHomeService } from './health-home.service';
import { DailyJournalService } from './daily-journal.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthHomeController],
  providers: [HealthHomeService, DailyJournalService],
  exports: [HealthHomeService, DailyJournalService],
})
export class HealthHomeModule {}
