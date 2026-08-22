import {
  IsEnum,
  IsJSON,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { AIAssessmentStatus } from '@prisma/client';

export class CreateAIAnalysisDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsString()
  analysisType?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsJSON()
  requestPayload?: any;

  @IsOptional()
  @IsJSON()
  responsePayload?: any;

  @IsOptional()
  @IsEnum(AIAssessmentStatus)
  status?: AIAssessmentStatus;
}