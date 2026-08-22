import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { RiskAssessmentResultsController } from './risk-assessment-results.controller';
import { RiskAssessmentResultsService } from './risk-assessment-results.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    RiskAssessmentResultsController,
  ],

  providers: [
    RiskAssessmentResultsService,
  ],

  exports: [
    RiskAssessmentResultsService,
  ],
})
export class RiskAssessmentResultsModule {}