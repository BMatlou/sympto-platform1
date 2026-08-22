import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateAIObservationDto {
  @IsUUID()
  symptomLogId!: string;

  @IsOptional()
  @IsUUID()
  aiAnalysisId?: string;

  @IsString()
  observation!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceScore?: number;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @IsBoolean()
  requiresAttention?: boolean;

  @IsOptional()
  @IsBoolean()
  reviewed?: boolean;

  @IsOptional()
  @IsDateString()
  reviewedAt?: string;
}