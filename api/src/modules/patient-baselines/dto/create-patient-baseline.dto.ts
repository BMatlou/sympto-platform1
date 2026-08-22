import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePatientBaselineDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsNumberString()
  weightKg?: string;

  @IsOptional()
  @IsNumberString()
  heightCm?: string;

  @IsOptional()
  @IsNumberString()
  bmi?: string;

  @IsOptional()
  systolicPressure?: number;

  @IsOptional()
  diastolicPressure?: number;

  @IsOptional()
  restingHeartRate?: number;

  @IsOptional()
  respiratoryRate?: number;

  @IsOptional()
  @IsNumberString()
  oxygenSaturation?: string;

  @IsOptional()
  @IsNumberString()
  bodyTemperature?: string;

  @IsOptional()
  @IsNumberString()
  bloodGlucose?: string;

  @IsOptional()
  @IsNumberString()
  cholesterol?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  establishedAt?: string;
}