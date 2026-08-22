import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClinicalEpisodesController } from './clinical-episodes.controller';
import { ClinicalEpisodesService } from './clinical-episodes.service';

@Module({
  imports: [DatabaseModule],

  controllers: [ClinicalEpisodesController],

  providers: [ClinicalEpisodesService],

  exports: [ClinicalEpisodesService],
})
export class ClinicalEpisodesModule {}