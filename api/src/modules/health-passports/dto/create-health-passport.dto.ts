import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { BloodType } from '@prisma/client';

export class CreateHealthPassportDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsBoolean()
  organDonor?: boolean;

  @IsOptional()
  @IsString()
  emergencyNotes?: string;

  @IsOptional()
  @IsBoolean()
  shareByDefault?: boolean;
}