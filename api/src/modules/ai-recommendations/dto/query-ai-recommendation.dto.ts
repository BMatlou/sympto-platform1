import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import { AIRecommendationType } from '@prisma/client';

export class QueryAIRecommendationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsUUID()
  assessmentId?: string;

  @IsOptional()
  @IsEnum(AIRecommendationType)
  recommendationType?: AIRecommendationType;
}