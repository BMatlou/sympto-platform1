import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsController } from './health-goals.controller';
import { HealthGoalsService } from './health-goals.service';
import { GoalsEngineService } from './goals-engine.service';
import { GoalMetricActionService } from './goal-metric-action.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthGoalsController],
  providers: [HealthGoalsService, GoalsEngineService, GoalMetricActionService],
  exports: [HealthGoalsService, GoalsEngineService, GoalMetricActionService],
})
export class HealthGoalsModule {}
