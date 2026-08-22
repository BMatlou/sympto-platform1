import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClinicalEpisodeAttachmentsController } from './clinical-episode-attachments.controller';
import { ClinicalEpisodeAttachmentsService } from './clinical-episode-attachments.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    ClinicalEpisodeAttachmentsController,
  ],

  providers: [
    ClinicalEpisodeAttachmentsService,
  ],

  exports: [
    ClinicalEpisodeAttachmentsService,
  ],
})
export class ClinicalEpisodeAttachmentsModule {}