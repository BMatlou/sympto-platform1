import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AIClinicalReviewsController } from './ai-clinical-reviews.controller';
import { AIClinicalReviewsService } from './ai-clinical-reviews.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AIClinicalReviewsController,
  ],

  providers: [
    AIClinicalReviewsService,
  ],

  exports: [
    AIClinicalReviewsService,
  ],
})
export class AIClinicalReviewsModule {}