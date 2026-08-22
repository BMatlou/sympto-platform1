import { PartialType } from '@nestjs/mapped-types';

import { CreatePatientAllergyDto } from './create-patient-allergy.dto';
import { AllergySeverity } from '@prisma/client';

export class UpdatePatientAllergyDto extends PartialType(
  CreatePatientAllergyDto,
) {}