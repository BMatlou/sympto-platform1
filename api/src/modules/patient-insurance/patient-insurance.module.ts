import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PatientInsuranceController } from './patient-insurance.controller';
import { PatientInsuranceService } from './patient-insurance.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    PatientInsuranceController,
  ],
  providers: [
    PatientInsuranceService,
  ],
  exports: [
    PatientInsuranceService,
  ],
})
export class PatientInsuranceModule {}