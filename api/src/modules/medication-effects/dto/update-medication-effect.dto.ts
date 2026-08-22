import { PartialType } from '@nestjs/mapped-types';

import { CreateMedicationEffectDto } from './create-medication-effect.dto';

export class UpdateMedicationEffectDto extends PartialType(
  CreateMedicationEffectDto,
) {}