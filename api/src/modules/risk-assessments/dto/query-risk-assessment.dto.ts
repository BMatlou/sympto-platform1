import {
  RiskAssessmentType,
  RiskLevel,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryRiskAssessmentDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  clinicalEpisodeId?: string;

  @IsOptional()
  @IsEnum(RiskAssessmentType)
  assessmentType?: RiskAssessmentType;

  @IsOptional()
  @IsEnum(RiskLevel)
  overallRisk?: RiskLevel;
}