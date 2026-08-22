import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CarePlanNotesController } from './care-plan-notes.controller';
import { CarePlanNotesService } from './care-plan-notes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CarePlanNotesController],
  providers: [CarePlanNotesService],
  exports: [CarePlanNotesService],
})
export class CarePlanNotesModule {}