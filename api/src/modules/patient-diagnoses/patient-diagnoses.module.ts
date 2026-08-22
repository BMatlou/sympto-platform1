import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PatientDiagnosesController } from './patient-diagnoses.controller';
import { PatientDiagnosesService } from './patient-diagnoses.service';

@Module({
  imports: [DatabaseModule],

  controllers: [PatientDiagnosesController],

  providers: [PatientDiagnosesService],

  exports: [PatientDiagnosesService],
})
export class PatientDiagnosesModule {}