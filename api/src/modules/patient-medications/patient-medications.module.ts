import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PatientMedicationsController } from './patient-medications.controller';
import { PatientMedicationsService } from './patient-medications.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientMedicationsController],
  providers: [PatientMedicationsService],
  exports: [PatientMedicationsService],
})
export class PatientMedicationsModule {}