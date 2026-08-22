import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  AIAssessmentStatus,
  AISeverity,
} from '@prisma/client';

export class QueryAISymptomAssessmentDto {
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
  patientId?: string;

  @IsOptional()
  @IsUUID()
 createdByUserId?: string;

  @IsOptional()
  @IsUUID()
  referralId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsEnum(AIAssessmentStatus)
  status?: AIAssessmentStatus;

  @IsOptional()
  @IsEnum(AISeverity)
  severity?: AISeverity;
}