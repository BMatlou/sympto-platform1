import { PartialType } from '@nestjs/mapped-types';

import { CreateAIAnalysisDto } from './create-ai-analysis.dto';

export class UpdateAIAnalysisDto extends PartialType(
  CreateAIAnalysisDto,
) {}