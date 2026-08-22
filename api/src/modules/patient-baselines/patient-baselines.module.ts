import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PatientBaselinesController } from './patient-baselines.controller';
import { PatientBaselinesService } from './patient-baselines.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    PatientBaselinesController,
  ],

  providers: [
    PatientBaselinesService,
  ],

  exports: [
    PatientBaselinesService,
  ],
})
export class PatientBaselinesModule {}