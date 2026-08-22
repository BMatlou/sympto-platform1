import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PractitionerAvailabilityController } from './practitioner-availability.controller';
import { PractitionerAvailabilityService } from './practitioner-availability.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PractitionerAvailabilityController],
  providers: [PractitionerAvailabilityService],
  exports: [PractitionerAvailabilityService],
})
export class PractitionerAvailabilityModule {}