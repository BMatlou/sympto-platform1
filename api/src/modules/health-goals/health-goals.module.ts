import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { HealthGoalsController } from './health-goals.controller';
import { HealthGoalsService } from './health-goals.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    HealthGoalsController,
  ],

  providers: [
    HealthGoalsService,
  ],

  exports: [
    HealthGoalsService,
  ],
})
export class HealthGoalsModule {}