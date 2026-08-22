import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PracticeLocationsController } from './practice-locations.controller';
import { PracticeLocationsService } from './practice-locations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PracticeLocationsController],
  providers: [PracticeLocationsService],
  exports: [PracticeLocationsService],
})
export class PracticeLocationsModule {}