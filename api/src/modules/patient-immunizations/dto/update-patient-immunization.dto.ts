import { PartialType } from '@nestjs/mapped-types';

import { CreatePatientImmunizationDto } from './create-patient-immunization.dto';

export class UpdatePatientImmunizationDto extends PartialType(
  CreatePatientImmunizationDto,
) {}