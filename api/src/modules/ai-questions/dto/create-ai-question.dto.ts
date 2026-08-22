import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { AIQuestionType } from '@prisma/client';

export class CreateAIQuestionDto {
  @IsUUID()
  assessmentId!: string;

  @IsString()
  question!: string;

  @IsEnum(AIQuestionType)
  type!: AIQuestionType;

  @IsOptional()
  @IsString()
  answer?: string;
}