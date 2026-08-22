import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SpecimenCollectionsController } from './specimen-collections.controller';
import { SpecimenCollectionsService } from './specimen-collections.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SpecimenCollectionsController],
  providers: [SpecimenCollectionsService],
  exports: [SpecimenCollectionsService],
})
export class SpecimenCollectionsModule {}