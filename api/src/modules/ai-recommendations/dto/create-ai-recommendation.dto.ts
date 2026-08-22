import {
  IsEnum,
  IsString,
  IsUUID,
} from 'class-validator';

import { AIRecommendationType } from '@prisma/client';

export class CreateAIRecommendationDto {
  @IsUUID()
  assessmentId!: string;

  @IsEnum(AIRecommendationType)
  recommendationType!: AIRecommendationType;

  @IsString()
  title!: string;

  @IsString()
  description!: string;
}