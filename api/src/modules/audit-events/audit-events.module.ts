import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AuditEventsController } from './audit-events.controller';
import { AuditEventsService } from './audit-events.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    AuditEventsController,
  ],

  providers: [
    AuditEventsService,
  ],

  exports: [
    AuditEventsService,
  ],
})
export class AuditEventsModule {}