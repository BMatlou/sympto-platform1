import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AppointmentSlotsController } from './appointment-slots.controller';
import { AppointmentSlotsService } from './appointment-slots.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AppointmentSlotsController],
  providers: [AppointmentSlotsService],
  exports: [AppointmentSlotsService],
})
export class AppointmentSlotsModule {}