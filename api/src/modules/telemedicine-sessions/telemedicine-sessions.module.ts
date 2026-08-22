import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { TelemedicineSessionsController } from './telemedicine-sessions.controller';
import { TelemedicineSessionsService } from './telemedicine-sessions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    TelemedicineSessionsController,
  ],
  providers: [
    TelemedicineSessionsService,
  ],
  exports: [
    TelemedicineSessionsService,
  ],
})
export class TelemedicineSessionsModule {}