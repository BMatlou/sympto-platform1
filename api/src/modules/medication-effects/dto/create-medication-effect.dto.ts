import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateMedicationEffectDto {
  @IsUUID()
  symptomLogId!: string;

  @IsUUID()
  medicationId!: string;

  @IsOptional()
  @IsUUID()
  prescriptionId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  effectiveness?: number;

  @IsOptional()
  @IsBoolean()
  improved?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  improvementPercentage?: number;

  @IsOptional()
  @IsDateString()
  startedMedicationAt?: string;

  @IsOptional()
  @IsDateString()
  improvementObservedAt?: string;

  @IsOptional()
  @IsDateString()
  stoppedMedicationAt?: string;

  @IsOptional()
  @IsString()
  sideEffects?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}