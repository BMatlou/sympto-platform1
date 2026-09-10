import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DataAccessConsentsController } from './data-access-consents.controller';
import { DataAccessConsentsService } from './data-access-consents.service';
import { SmartFileConsentController } from './smart-file-consent.controller';
import { SmartFileConsentService } from './smart-file-consent.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    DataAccessConsentsController,
    SmartFileConsentController,
  ],

  providers: [
    DataAccessConsentsService,
    SmartFileConsentService,
  ],

  exports: [
    DataAccessConsentsService,
    SmartFileConsentService,
  ],
})
export class DataAccessConsentsModule {}