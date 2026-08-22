import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PatientProceduresController } from './patient-procedures.controller';
import { PatientProceduresService } from './patient-procedures.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientProceduresController],
  providers: [PatientProceduresService],
  exports: [PatientProceduresService],
})
export class PatientProceduresModule {}