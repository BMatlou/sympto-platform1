import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AIQuestionsController } from './ai-questions.controller';
import { AIQuestionsService } from './ai-questions.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AIQuestionsController,
  ],

  providers: [
    AIQuestionsService,
  ],

  exports: [
    AIQuestionsService,
  ],
})
export class AIQuestionsModule {}