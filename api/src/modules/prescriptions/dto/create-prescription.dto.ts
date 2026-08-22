import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { PrescriptionStatus } from '@prisma/client';

export class CreatePrescriptionDto {
  @IsUUID()
  encounterId!: string;

  @IsUUID()
  patientId!: string;

  @IsUUID()
  practitionerId!: string;

  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}