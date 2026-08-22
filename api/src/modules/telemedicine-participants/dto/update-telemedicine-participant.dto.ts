import { PartialType } from '@nestjs/mapped-types';

import { CreateTelemedicineParticipantDto } from './create-telemedicine-participant.dto';

export class UpdateTelemedicineParticipantDto extends PartialType(
  CreateTelemedicineParticipantDto,
) {}