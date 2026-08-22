import {
  CDSRecommendationType,
  CDSSeverity,
  CDSStatus,
} from '@prisma/client';

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClinicalDecisionSupportDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsUUID()
  practitionerId!: string;

  @IsEnum(CDSRecommendationType)
  recommendationType!: CDSRecommendationType;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsString()
  guidelineSource?: string;

  @IsOptional()
  @IsString()
  aiModel?: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsEnum(CDSSeverity)
  severity!: CDSSeverity;

  @IsOptional()
  @IsEnum(CDSStatus)
  status?: CDSStatus;
}