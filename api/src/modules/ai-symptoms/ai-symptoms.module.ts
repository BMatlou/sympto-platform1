import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AISymptomsController } from './ai-symptoms.controller';
import { AISymptomsService } from './ai-symptoms.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AISymptomsController,
  ],

  providers: [
    AISymptomsService,
  ],

  exports: [
    AISymptomsService,
  ],
})
export class AISymptomsModule {}