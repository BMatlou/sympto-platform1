import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsModule } from '../health-goals/health-goals.module';

import { HealthJournalsController } from './health-journals.controller';
import { HealthJournalsService } from './health-journals.service';
import { SymptomIntelligenceService } from './symptom-intelligence.service';

@Module({
  imports: [
    DatabaseModule,
    HealthGoalsModule,
  ],

  controllers: [
    HealthJournalsController,
  ],

  providers: [
    HealthJournalsService,
    SymptomIntelligenceService,
  ],

  exports: [
    HealthJournalsService,
    SymptomIntelligenceService,
  ],
})
export class HealthJournalsModule {}
