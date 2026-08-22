import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SymptomLogItemsController } from './symptom-log-items.controller';
import { SymptomLogItemsService } from './symptom-log-items.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    SymptomLogItemsController,
  ],

  providers: [
    SymptomLogItemsService,
  ],

  exports: [
    SymptomLogItemsService,
  ],
})
export class SymptomLogItemsModule {}