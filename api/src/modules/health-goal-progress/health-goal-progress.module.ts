import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { HealthGoalProgressController } from './health-goal-progress.controller';
import { HealthGoalProgressService } from './health-goal-progress.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    HealthGoalProgressController,
  ],

  providers: [
    HealthGoalProgressService,
  ],

  exports: [
    HealthGoalProgressService,
  ],
})
export class HealthGoalProgressModule {}