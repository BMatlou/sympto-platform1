import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsController } from './health-goals.controller';
import { HealthGoalsService } from './health-goals.service';
import { GoalsEngineService } from './goals-engine.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthGoalsController],
  providers: [HealthGoalsService, GoalsEngineService],
  exports: [HealthGoalsService, GoalsEngineService],
})
export class HealthGoalsModule {}
