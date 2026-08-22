import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabResultsController } from './lab-results.controller';
import { LabResultsService } from './lab-results.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabResultsController],
  providers: [LabResultsService],
  exports: [LabResultsService],
})
export class LabResultsModule {}