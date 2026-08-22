import {
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRiskAssessmentResultDto {
  @IsUUID()
  riskAssessmentId!: string;

  @IsString()
  factor!: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsNumberString()
  score?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;
}