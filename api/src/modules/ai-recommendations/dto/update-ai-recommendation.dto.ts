import { PartialType } from '@nestjs/mapped-types';

import { CreateAIRecommendationDto } from './create-ai-recommendation.dto';

export class UpdateAIRecommendationDto extends PartialType(
  CreateAIRecommendationDto,
) {}