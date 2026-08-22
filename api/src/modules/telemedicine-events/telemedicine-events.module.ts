import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { TelemedicineEventsController } from './telemedicine-events.controller';
import { TelemedicineEventsService } from './telemedicine-events.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    TelemedicineEventsController,
  ],

  providers: [
    TelemedicineEventsService,
  ],

  exports: [
    TelemedicineEventsService,
  ],
})
export class TelemedicineEventsModule {}