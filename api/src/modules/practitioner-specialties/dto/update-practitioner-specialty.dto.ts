import { PartialType } from '@nestjs/mapped-types';

import { CreatePractitionerSpecialtyDto } from './create-practitioner-specialty.dto';

export class UpdatePractitionerSpecialtyDto extends PartialType(
  CreatePractitionerSpecialtyDto,
) {}