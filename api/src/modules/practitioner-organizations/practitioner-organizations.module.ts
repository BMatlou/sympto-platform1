import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PractitionerOrganizationsController } from './practitioner-organizations.controller';
import { PractitionerOrganizationsService } from './practitioner-organizations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PractitionerOrganizationsController],
  providers: [PractitionerOrganizationsService],
  exports: [PractitionerOrganizationsService],
})
export class PractitionerOrganizationsModule {}