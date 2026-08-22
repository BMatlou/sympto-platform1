import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
} from 'class-validator';

import { MedicationStatus } from '@prisma/client';

export class CreatePatientMedicationDto {
  @IsUUID()
  healthPassportId!: string;

  @IsUUID()
  medicationId!: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  prescribedBy?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
@IsEnum(MedicationStatus)
status?: MedicationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}