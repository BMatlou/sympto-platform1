import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { TelemedicineParticipantsController } from './telemedicine-participants.controller';
import { TelemedicineParticipantsService } from './telemedicine-participants.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    TelemedicineParticipantsController,
  ],

  providers: [
    TelemedicineParticipantsService,
  ],

  exports: [
    TelemedicineParticipantsService,
  ],
})
export class TelemedicineParticipantsModule {}