import { PartialType } from '@nestjs/mapped-types';

import { CreatePractitionerQualificationDto } from './create-practitioner-qualification.dto';

export class UpdatePractitionerQualificationDto extends PartialType(
  CreatePractitionerQualificationDto,
) {}