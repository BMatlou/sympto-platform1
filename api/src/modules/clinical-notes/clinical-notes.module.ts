import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClinicalNotesController } from './clinical-notes.controller';
import { ClinicalNotesService } from './clinical-notes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService],
  exports: [ClinicalNotesService],
})
export class ClinicalNotesModule {}