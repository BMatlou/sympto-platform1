import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PatientAllergiesController } from './patient-allergies.controller';
import { PatientAllergiesService } from './patient-allergies.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientAllergiesController],
  providers: [PatientAllergiesService],
  exports: [PatientAllergiesService],
})
export class PatientAllergiesModule {}