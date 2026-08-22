import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AppointmentRemindersController } from './appointment-reminders.controller';
import { AppointmentRemindersService } from './appointment-reminders.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AppointmentRemindersController],
  providers: [AppointmentRemindersService],
  exports: [AppointmentRemindersService],
})
export class AppointmentRemindersModule {}