import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { MedicationEffectsController } from './medication-effects.controller';
import { MedicationEffectsService } from './medication-effects.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    MedicationEffectsController,
  ],

  providers: [
    MedicationEffectsService,
  ],

  exports: [
    MedicationEffectsService,
  ],
})
export class MedicationEffectsModule {}