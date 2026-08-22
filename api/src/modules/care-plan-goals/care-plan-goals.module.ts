import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CarePlanGoalsController } from './care-plan-goals.controller';
import { CarePlanGoalsService } from './care-plan-goals.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CarePlanGoalsController],
  providers: [CarePlanGoalsService],
  exports: [CarePlanGoalsService],
})
export class CarePlanGoalsModule {}