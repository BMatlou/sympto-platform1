import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SymptomTriggersController } from './symptom-triggers.controller';
import { SymptomTriggersService } from './symptom-triggers.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    SymptomTriggersController,
  ],

  providers: [
    SymptomTriggersService,
  ],

  exports: [
    SymptomTriggersService,
  ],
})
export class SymptomTriggersModule {}