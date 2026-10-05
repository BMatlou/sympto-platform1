import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsController } from './health-goals.controller';
import { PatientHealthGoalsController } from './patient-health-goals.controller';
import { HealthGoalsService } from './health-goals.service';
import { HealthGoalIntelligenceService } from './health-goal-intelligence.service';
import { HealthGoalMetricSchemaService } from './health-goal-metric-schema.service';
import { GoalsEngineService } from './goals-engine-v3.service';
import { GoalsEngineService as CategoryAwareGoalsEngineService } from './goals-engine-v2.service';
import { MedicationInsightService } from './medication-insight.service';
import { MedicationConnectedGoalsEngine } from './medication-connected-goals.engine';
import { MedicationGoalIntelligenceEngine } from './medication-goal-intelligence.engine';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthGoalsController, PatientHealthGoalsController],
  providers: [
    CategoryAwareGoalsEngineService,
    GoalsEngineService,
    HealthGoalsService,
    HealthGoalIntelligenceService,
    HealthGoalMetricSchemaService,
    MedicationInsightService,
    MedicationConnectedGoalsEngine,
    MedicationGoalIntelligenceEngine,
  ],
  exports: [
    GoalsEngineService,
    HealthGoalsService,
    HealthGoalIntelligenceService,
  ],
})
export class HealthGoalsModule {}
