import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabResultItemsController } from './lab-result-items.controller';
import { LabResultItemsService } from './lab-result-items.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabResultItemsController],
  providers: [LabResultItemsService],
  exports: [LabResultItemsService],
})
export class LabResultItemsModule {}