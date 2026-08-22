import {
  PainCharacter,
  SymptomFrequency,
  SymptomProgression,
  SymptomSeverity,
} from '@prisma/client';

import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateSymptomLogItemDto {
  @IsUUID()
  symptomLogId!: string;

  @IsUUID()
  symptomId!: string;

  @IsOptional()
  @IsUUID()
  aISymptomId?: string;

  @IsOptional()
  @IsEnum(SymptomSeverity)
  severity?: SymptomSeverity;

  @IsOptional()
  @IsEnum(SymptomProgression)
  progression?: SymptomProgression;

  @IsOptional()
  @IsEnum(SymptomFrequency)
  frequency?: SymptomFrequency;

  @IsOptional()
  @IsEnum(PainCharacter)
  painCharacter?: PainCharacter;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScore?: number;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @IsOptional()
  @IsDateString()
  onsetAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsBoolean()
  intermittent?: boolean;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @IsString()
  suspectedTrigger?: string;

  @IsOptional()
  @IsString()
  aggravatingFactors?: string;

  @IsOptional()
  @IsString()
  relievingFactors?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}