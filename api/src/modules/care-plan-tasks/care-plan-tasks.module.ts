import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CarePlanTasksController } from './care-plan-tasks.controller';
import { PatientCarePlanTasksController } from './patient-care-plan-tasks.controller';
import { CarePlanTasksService } from './care-plan-tasks.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CarePlanTasksController, PatientCarePlanTasksController],
  providers: [CarePlanTasksService],
  exports: [CarePlanTasksService],
})
export class CarePlanTasksModule {}