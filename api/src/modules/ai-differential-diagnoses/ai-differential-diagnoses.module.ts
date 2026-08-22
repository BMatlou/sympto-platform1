import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AIDifferentialDiagnosesController } from './ai-differential-diagnoses.controller';
import { AIDifferentialDiagnosesService } from './ai-differential-diagnoses.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AIDifferentialDiagnosesController,
  ],

  providers: [
    AIDifferentialDiagnosesService,
  ],

  exports: [
    AIDifferentialDiagnosesService,
  ],
})
export class AIDifferentialDiagnosesModule {}