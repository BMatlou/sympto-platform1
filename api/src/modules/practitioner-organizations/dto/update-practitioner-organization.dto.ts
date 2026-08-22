import { PartialType } from '@nestjs/mapped-types';

import { CreatePractitionerOrganizationDto } from './create-practitioner-organization.dto';

export class UpdatePractitionerOrganizationDto extends PartialType(
  CreatePractitionerOrganizationDto,
) {}