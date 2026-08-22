import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AIRecommendationsController } from './ai-recommendations.controller';
import { AIRecommendationsService } from './ai-recommendations.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AIRecommendationsController,
  ],

  providers: [
    AIRecommendationsService,
  ],

  exports: [
    AIRecommendationsService,
  ],
})
export class AIRecommendationsModule {}