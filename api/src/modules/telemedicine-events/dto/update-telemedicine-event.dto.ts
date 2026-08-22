import { PartialType } from '@nestjs/mapped-types';

import { CreateTelemedicineEventDto } from './create-telemedicine-event.dto';

export class UpdateTelemedicineEventDto extends PartialType(
  CreateTelemedicineEventDto,
) {}