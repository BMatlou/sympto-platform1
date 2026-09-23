import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SymptomFrequency,
  SymptomProgression,
  SymptomSeverity,
} from '@prisma/client';

export class MonitorSymptomDto {
  @IsEnum(SymptomSeverity)
  severity!: SymptomSeverity;

  @IsOptional()
  @IsEnum(SymptomProgression)
  progression?: SymptomProgression;

  @IsOptional()
  @IsEnum(SymptomFrequency)
  frequency?: SymptomFrequency;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScore?: number;

  @IsOptional()
  @IsBoolean()
  stillPresent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  suspectedTrigger?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  aggravatingFactors?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  relievingFactors?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
