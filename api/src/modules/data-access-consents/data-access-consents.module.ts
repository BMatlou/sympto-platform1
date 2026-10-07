import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { DataAccessConsentsController } from './data-access-consents.controller';
import { DataAccessConsentsService } from './data-access-consents.service';
import { SmartFileConsentController } from './smart-file-consent.controller';
import { SmartFileConsentService } from './smart-file-consent.service';
import { SmartFileClinicalController } from './smart-file-clinical.controller';
import { SmartFileClinicalService } from './smart-file-clinical.service';
import { SmartFileClinicalWriteService } from './smart-file-clinical-write.service';
import { SmartFileClinicalWriteService } from './smart-file-clinical-write.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [
    DataAccessConsentsController,
    SmartFileConsentController,
    SmartFileClinicalController,
  ],
  providers: [
    DataAccessConsentsService,
    SmartFileConsentService,
    SmartFileClinicalService,
    SmartFileClinicalWriteService,
  ],
  exports: [
    DataAccessConsentsService,
    SmartFileConsentService,
    SmartFileClinicalService,
    SmartFileClinicalWriteService,
  ],
})
export class DataAccessConsentsModule {}
