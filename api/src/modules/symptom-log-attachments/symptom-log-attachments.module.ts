import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SymptomLogAttachmentsController } from './symptom-log-attachments.controller';
import { SymptomLogAttachmentsService } from './symptom-log-attachments.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    SymptomLogAttachmentsController,
  ],

  providers: [
    SymptomLogAttachmentsService,
  ],

  exports: [
    SymptomLogAttachmentsService,
  ],
})
export class SymptomLogAttachmentsModule {}