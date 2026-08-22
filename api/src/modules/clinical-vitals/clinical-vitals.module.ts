import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClinicalVitalsController } from './clinical-vitals.controller';
import { ClinicalVitalsService } from './clinical-vitals.service';

@Module({
  imports: [DatabaseModule],

  controllers: [ClinicalVitalsController],

  providers: [ClinicalVitalsService],

  exports: [ClinicalVitalsService],
})
export class ClinicalVitalsModule {}