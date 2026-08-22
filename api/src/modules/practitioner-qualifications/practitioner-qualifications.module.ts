import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PractitionerQualificationsController } from './practitioner-qualifications.controller';
import { PractitionerQualificationsService } from './practitioner-qualifications.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PractitionerQualificationsController],
  providers: [PractitionerQualificationsService],
  exports: [PractitionerQualificationsService],
})
export class PractitionerQualificationsModule {}