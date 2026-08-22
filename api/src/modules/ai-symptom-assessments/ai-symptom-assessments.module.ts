import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AISymptomAssessmentsController } from './ai-symptom-assessments.controller';
import { AISymptomAssessmentsService } from './ai-symptom-assessments.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AISymptomAssessmentsController,
  ],

  providers: [
    AISymptomAssessmentsService,
  ],

  exports: [
    AISymptomAssessmentsService,
  ],
})
export class AISymptomAssessmentsModule {}