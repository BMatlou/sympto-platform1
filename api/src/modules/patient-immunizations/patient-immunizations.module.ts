import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PatientImmunizationsController } from './patient-immunizations.controller';
import { PatientImmunizationsService } from './patient-immunizations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientImmunizationsController],
  providers: [PatientImmunizationsService],
  exports: [PatientImmunizationsService],
})
export class PatientImmunizationsModule {}