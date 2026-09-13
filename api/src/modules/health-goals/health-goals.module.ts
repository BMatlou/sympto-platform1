import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsController } from './health-goals.controller';
import { PatientHealthGoalsController } from './patient-health-goals.controller';
import { HealthGoalsService } from './health-goals.service';
import { HealthGoalIntelligenceService } from './health-goal-intelligence.service';
import { GoalsEngineService } from './goals-engine-v3.service';
import { GoalsEngineService as CategoryAwareGoalsEngineService } from './goals-engine-v2.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthGoalsController, PatientHealthGoalsController],
  providers: [
    CategoryAwareGoalsEngineService,
    GoalsEngineService,
    HealthGoalsService,
    HealthGoalIntelligenceService,
  ],
  exports: [
    GoalsEngineService,
    HealthGoalsService,
    HealthGoalIntelligenceService,
  ],
})
export class HealthGoalsModule {}
