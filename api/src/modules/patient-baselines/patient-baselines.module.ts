import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HealthGoalsModule } from '../health-goals/health-goals.module';
import { PatientBaselinesController } from './patient-baselines.controller';
import { PatientBaselinesService } from './patient-baselines.service';

@Module({
  imports: [DatabaseModule, HealthGoalsModule],
  controllers: [PatientBaselinesController],
  providers: [PatientBaselinesService],
  exports: [PatientBaselinesService],
})
export class PatientBaselinesModule {}
