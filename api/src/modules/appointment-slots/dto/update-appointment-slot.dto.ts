import { PartialType } from '@nestjs/mapped-types';

import { CreateAppointmentSlotDto } from './create-appointment-slot.dto';

export class UpdateAppointmentSlotDto extends PartialType(
  CreateAppointmentSlotDto,
) {}