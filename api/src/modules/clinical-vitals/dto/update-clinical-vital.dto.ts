import { PartialType } from '@nestjs/mapped-types';

import { CreateClinicalVitalDto } from './create-clinical-vital.dto';

export class UpdateClinicalVitalDto extends PartialType(
  CreateClinicalVitalDto,
) {}