import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CdsRulesController } from './cds-rules.controller';
import { CdsRulesService } from './cds-rules.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CdsRulesController],
  providers: [CdsRulesService],
  exports: [CdsRulesService],
})
export class CdsRulesModule {}