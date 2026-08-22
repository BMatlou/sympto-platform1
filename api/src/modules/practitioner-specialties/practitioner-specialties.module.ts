import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PractitionerSpecialtiesController } from './practitioner-specialties.controller';
import { PractitionerSpecialtiesService } from './practitioner-specialties.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PractitionerSpecialtiesController],
  providers: [PractitionerSpecialtiesService],
  exports: [PractitionerSpecialtiesService],
})
export class PractitionerSpecialtiesModule {}