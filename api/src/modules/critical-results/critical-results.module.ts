import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CriticalResultsController } from './critical-results.controller';
import { CriticalResultsService } from './critical-results.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CriticalResultsController],
  providers: [CriticalResultsService],
  exports: [CriticalResultsService],
})
export class CriticalResultsModule {}