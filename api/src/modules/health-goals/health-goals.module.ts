import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsController } from './health-goals.controller';
import { PatientHealthGoalsController } from './patient-health-goals.controller';
import { HealthGoalsService } from './health-goals.service';
import { HealthGoalIntelligenceService } from './health-goal-intelligence.service';
import { GoalsEngineService } from './goals-engine-v3.service';
import { GoalsEngineService as CategoryAwareGoalsEngineService } from './goals-engine-v2.service';
import { AlcoholResetScheduler } from './schedulers/alcohol-reset.scheduler';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [HealthGoalsController, PatientHealthGoalsController],
  providers: [
    CategoryAwareGoalsEngineService,
    GoalsEngineService,
    HealthGoalsService,
    HealthGoalIntelligenceService,
    AlcoholResetScheduler,
  ],
  exports: [
    GoalsEngineService,
    HealthGoalsService,
    HealthGoalIntelligenceService,
  ],
})
export class HealthGoalsModule {}
