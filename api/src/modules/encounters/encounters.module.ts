import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';

@Module({
  imports: [DatabaseModule],

  controllers: [EncountersController],

  providers: [EncountersService],

  exports: [EncountersService],
})
export class EncountersModule {}