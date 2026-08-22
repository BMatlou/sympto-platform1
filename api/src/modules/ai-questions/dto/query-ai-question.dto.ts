import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import { AIQuestionType } from '@prisma/client';

export class QueryAIQuestionDto {
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
  @IsEnum(AIQuestionType)
  type?: AIQuestionType;
}