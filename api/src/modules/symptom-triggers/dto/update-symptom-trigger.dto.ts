import { PartialType } from '@nestjs/mapped-types';

import { CreateSymptomTriggerDto } from './create-symptom-trigger.dto';

export class UpdateSymptomTriggerDto extends PartialType(
  CreateSymptomTriggerDto,
) {}