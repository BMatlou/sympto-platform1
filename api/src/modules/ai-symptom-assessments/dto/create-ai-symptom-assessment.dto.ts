import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  AIAssessmentStatus,
  AISeverity,
} from '@prisma/client';

export class CreateAISymptomAssessmentDto {
  @IsUUID()
  patientId!: string;

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

  @IsOptional()
  @IsString()
  summary?: string;
}