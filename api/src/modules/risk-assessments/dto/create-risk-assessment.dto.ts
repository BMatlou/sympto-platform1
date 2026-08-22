import {
  RiskAssessmentType,
  RiskLevel,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRiskAssessmentDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  clinicalEpisodeId?: string;

  @IsEnum(RiskAssessmentType)
  assessmentType!: RiskAssessmentType;

  @IsEnum(RiskLevel)
  overallRisk!: RiskLevel;

  @IsOptional()
  @IsNumberString()
  score?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  assessedAt!: string;
}