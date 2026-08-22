import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ReferenceRangesController } from './reference-ranges.controller';
import { ReferenceRangesService } from './reference-ranges.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    ReferenceRangesController,
  ],

  providers: [
    ReferenceRangesService,
  ],

  exports: [
    ReferenceRangesService,
  ],
})
export class ReferenceRangesModule {}