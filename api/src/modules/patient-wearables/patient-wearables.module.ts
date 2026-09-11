import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { PatientWearablesController } from './patient-wearables.controller';
import { PatientWearablesService } from './patient-wearables.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientWearablesController],
  providers: [PatientWearablesService],
})
export class PatientWearablesModule {}
