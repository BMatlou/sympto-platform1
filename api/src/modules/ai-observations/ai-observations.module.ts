import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AIObservationsController } from './ai-observations.controller';
import { AIObservationsService } from './ai-observations.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AIObservationsController,
  ],

  providers: [
    AIObservationsService,
  ],

  exports: [
    AIObservationsService,
  ],
})
export class AIObservationsModule {}