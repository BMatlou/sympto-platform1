import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClinicalDecisionSupportController } from './clinical-decision-support.controller';
import { ClinicalDecisionSupportService } from './clinical-decision-support.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ClinicalDecisionSupportController],
  providers: [ClinicalDecisionSupportService],
  exports: [ClinicalDecisionSupportService],
})
export class ClinicalDecisionSupportModule {}