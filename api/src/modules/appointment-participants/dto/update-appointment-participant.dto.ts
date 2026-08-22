import { PartialType } from '@nestjs/mapped-types';

import { CreateAppointmentParticipantDto } from './create-appointment-participant.dto';

export class UpdateAppointmentParticipantDto extends PartialType(
  CreateAppointmentParticipantDto,
) {}