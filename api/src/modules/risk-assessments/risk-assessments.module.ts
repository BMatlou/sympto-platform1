import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { RiskAssessmentsController } from './risk-assessments.controller';
import { RiskAssessmentsService } from './risk-assessments.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    RiskAssessmentsController,
  ],

  providers: [
    RiskAssessmentsService,
  ],

  exports: [
    RiskAssessmentsService,
  ],
})
export class RiskAssessmentsModule {}