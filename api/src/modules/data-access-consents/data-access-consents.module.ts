import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DataAccessConsentsController } from './data-access-consents.controller';
import { DataAccessConsentsService } from './data-access-consents.service';
import { SmartFileConsentController } from './smart-file-consent.controller';
import { SmartFileConsentService } from './smart-file-consent.service';
import { SmartFileClinicalController } from './smart-file-clinical.controller';
import { SmartFileClinicalService } from './smart-file-clinical.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    DataAccessConsentsController,
    SmartFileConsentController,
    SmartFileClinicalController,
  ],
  providers: [
    DataAccessConsentsService,
    SmartFileConsentService,
    SmartFileClinicalService,
  ],
  exports: [
    DataAccessConsentsService,
    SmartFileConsentService,
    SmartFileClinicalService,
  ],
})
export class DataAccessConsentsModule {}
