import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ResultAttachmentsController } from './result-attachments.controller';
import { ResultAttachmentsService } from './result-attachments.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ResultAttachmentsController],
  providers: [ResultAttachmentsService],
  exports: [ResultAttachmentsService],
})
export class ResultAttachmentsModule {}