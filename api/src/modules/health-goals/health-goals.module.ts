import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { HealthGoalsController } from './health-goals.controller';
import { HealthGoalsService } from './health-goals.service';
import { HealthGoalIntelligenceService } from './health-goal-intelligence.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    HealthGoalsController,
  ],

  providers: [
    HealthGoalsService,
    HealthGoalIntelligenceService,
  ],

  exports: [
    HealthGoalsService,
    HealthGoalIntelligenceService,
  ],
})
export class HealthGoalsModule {}