import { PartialType } from '@nestjs/mapped-types';

import { CreateAISymptomDto } from './create-ai-symptom.dto';

export class UpdateAISymptomDto extends PartialType(
  CreateAISymptomDto,
) {}