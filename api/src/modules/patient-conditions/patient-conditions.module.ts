import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PatientConditionsController } from './patient-conditions.controller';
import { PatientConditionsService } from './patient-conditions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientConditionsController],
  providers: [PatientConditionsService],
  exports: [PatientConditionsService],
})
export class PatientConditionsModule {}