import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabTestsController } from './lab-tests.controller';
import { LabTestsService } from './lab-tests.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabTestsController],
  providers: [LabTestsService],
  exports: [LabTestsService],
})
export class LabTestsModule {}