import { PartialType } from '@nestjs/mapped-types';

import { CreateTelemedicineConsentDto } from './create-telemedicine-consent.dto';

export class UpdateTelemedicineConsentDto extends PartialType(
  CreateTelemedicineConsentDto,
) {}