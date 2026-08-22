import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AIAnalysesController } from './ai-analyses.controller';
import { AIAnalysesService } from './ai-analyses.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AIAnalysesController,
  ],

  providers: [
    AIAnalysesService,
  ],

  exports: [
    AIAnalysesService,
  ],
})
export class AIAnalysesModule {}