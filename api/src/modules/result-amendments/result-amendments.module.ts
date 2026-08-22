import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ResultAmendmentsController } from './result-amendments.controller';
import { ResultAmendmentsService } from './result-amendments.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ResultAmendmentsController],
  providers: [ResultAmendmentsService],
  exports: [ResultAmendmentsService],
})
export class ResultAmendmentsModule {}