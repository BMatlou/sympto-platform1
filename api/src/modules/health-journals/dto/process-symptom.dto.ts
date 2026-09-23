import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  MinLength,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PainCharacter,
  SymptomFrequency,
  SymptomProgression,
  SymptomSeverity,
} from '@prisma/client';

export class ProcessSymptomDto {
  @IsString()
  @MinLength(2)
  symptomName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsEnum(SymptomSeverity)
  severity!: SymptomSeverity;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsBoolean()
  onsetUncertain?: boolean;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

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
  @Min(1)
  durationMinutes?: number;

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
  triggerDetails?: string;

  @IsOptional()
  @IsBoolean()
  triggerConfirmed?: boolean;

  @IsOptional()
  @IsDateString()
  triggerExposureAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  occurredBeforeHours?: number;

  @IsOptional()
  @IsString()
  triggerNotes?: string;

  @IsOptional()
  @IsString()
  aggravatingFactors?: string;

  @IsOptional()
  @IsString()
  relievingFactors?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsUUID()
  medicationId?: string;

  @IsOptional()
  @IsUUID()
  prescriptionId?: string;

  @IsOptional()
  @IsBoolean()
  medicationImproved?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  medicationEffectiveness?: number;

  @IsOptional()
  @IsString()
  medicationSideEffects?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  medicationImprovementPercentage?: number;

  @IsOptional()
  @IsDateString()
  medicationStartedAt?: string;

  @IsOptional()
  @IsDateString()
  medicationImprovementObservedAt?: string;

  @IsOptional()
  @IsDateString()
  medicationStoppedAt?: string;

  @IsOptional()
  @IsString()
  medicationNotes?: string;
}
