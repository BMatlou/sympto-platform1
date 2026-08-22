import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AppointmentParticipantsController } from './appointment-participants.controller';
import { AppointmentParticipantsService } from './appointment-participants.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AppointmentParticipantsController],
  providers: [AppointmentParticipantsService],
  exports: [AppointmentParticipantsService],
})
export class AppointmentParticipantsModule {}