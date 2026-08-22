import { PartialType } from '@nestjs/mapped-types';

import { CreatePractitionerAvailabilityDto } from './create-practitioner-availability.dto';

export class UpdatePractitionerAvailabilityDto extends PartialType(
  CreatePractitionerAvailabilityDto,
) {}