import {
  SymptomLogStatus,
  SymptomProgression,
  SymptomSeverity,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSymptomLogDto {
  @IsUUID()
  clinicalEpisodeId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(SymptomLogStatus)
  status?: SymptomLogStatus;

  @IsOptional()
  @IsEnum(SymptomSeverity)
  overallSeverity?: SymptomSeverity;

  @IsOptional()
  @IsEnum(SymptomProgression)
  progression?: SymptomProgression;

  @IsDateString()
  startedAt!: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}