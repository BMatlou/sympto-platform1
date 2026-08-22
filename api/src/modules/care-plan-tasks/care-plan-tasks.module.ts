import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CarePlanTasksController } from './care-plan-tasks.controller';
import { CarePlanTasksService } from './care-plan-tasks.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CarePlanTasksController],
  providers: [CarePlanTasksService],
  exports: [CarePlanTasksService],
})
export class CarePlanTasksModule {}