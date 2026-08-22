import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { EncounterTypesController } from './encounter-types.controller';
import { EncounterTypesService } from './encounter-types.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EncounterTypesController],
  providers: [EncounterTypesService],
  exports: [EncounterTypesService],
})
export class EncounterTypesModule {}