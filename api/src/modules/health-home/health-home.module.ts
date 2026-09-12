import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsModule } from '../health-goals/health-goals.module';
import { HealthHomeController } from './health-home.controller';
import { HealthHomeService } from './health-home.service';
import { DailyJournalService } from './daily-journal.service';

@Module({
  imports: [DatabaseModule, HealthGoalsModule],
  controllers: [HealthHomeController],
  providers: [HealthHomeService, DailyJournalService],
  exports: [HealthHomeService, DailyJournalService],
})
export class HealthHomeModule {}
