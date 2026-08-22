import { PartialType } from '@nestjs/mapped-types';

import { CreateAISymptomAssessmentDto } from './create-ai-symptom-assessment.dto';

export class UpdateAISymptomAssessmentDto extends PartialType(
  CreateAISymptomAssessmentDto,
) {}