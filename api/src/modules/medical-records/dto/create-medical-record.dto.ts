import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { BloodType } from '@prisma/client';

export class CreateMedicalRecordDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @IsOptional()
  @IsString()
  pastMedicalHistory?: string;

  @IsOptional()
  @IsString()
  surgicalHistory?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  socialHistory?: string;

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  immunizationNotes?: string;

  @IsOptional()
  @IsBoolean()
  organDonor?: boolean;
}