import { PartialType } from '@nestjs/mapped-types';

import { CreateAppointmentReminderDto } from './create-appointment-reminder.dto';

export class UpdateAppointmentReminderDto extends PartialType(
  CreateAppointmentReminderDto,
) {}