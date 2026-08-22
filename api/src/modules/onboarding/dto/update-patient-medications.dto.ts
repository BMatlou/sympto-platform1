import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { MedicationStatus } from '@prisma/client';

import { Type } from 'class-transformer';

export class PatientMedicationItemDto {
  @IsUUID()
  medicationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  indication?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  prescribedBy?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsBoolean()
  ongoing?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adherencePercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  missedDoses?: number;

  @IsOptional()
  @IsString()
  sideEffects?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  effectiveness?: string;

  @IsOptional()
  @IsEnum(MedicationStatus)
  status?: MedicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdatePatientMedicationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientMedicationItemDto)
  medications!: PatientMedicationItemDto[];
}