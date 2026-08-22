import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { HealthJournalsController } from './health-journals.controller';
import { HealthJournalsService } from './health-journals.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    HealthJournalsController,
  ],

  providers: [
    HealthJournalsService,
  ],

  exports: [
    HealthJournalsService,
  ],
})
export class HealthJournalsModule {}