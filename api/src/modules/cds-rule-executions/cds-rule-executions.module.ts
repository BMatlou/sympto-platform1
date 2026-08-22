import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CdsRuleExecutionsController } from './cds-rule-executions.controller';
import { CdsRuleExecutionsService } from './cds-rule-executions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CdsRuleExecutionsController],
  providers: [CdsRuleExecutionsService],
  exports: [CdsRuleExecutionsService],
})
export class CdsRuleExecutionsModule {}