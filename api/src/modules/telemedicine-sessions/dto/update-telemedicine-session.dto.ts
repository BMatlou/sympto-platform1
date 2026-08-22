import { PartialType } from '@nestjs/mapped-types';

import { CreateTelemedicineSessionDto } from './create-telemedicine-session.dto';

export class UpdateTelemedicineSessionDto extends PartialType(
  CreateTelemedicineSessionDto,
) {}