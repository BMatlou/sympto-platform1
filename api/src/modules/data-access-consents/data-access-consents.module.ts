import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DataAccessConsentsController } from './data-access-consents.controller';
import { DataAccessConsentsService } from './data-access-consents.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    DataAccessConsentsController,
  ],

  providers: [
    DataAccessConsentsService,
  ],

  exports: [
    DataAccessConsentsService,
  ],
})
export class DataAccessConsentsModule {}