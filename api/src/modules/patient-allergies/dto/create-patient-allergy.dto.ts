import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
} from 'class-validator';

import { AllergySeverity } from '@prisma/client';

export class CreatePatientAllergyDto {
  @IsUUID()
  healthPassportId!: string;

  @IsUUID()
  allergyId!: string;

  @IsOptional()
@IsEnum(AllergySeverity)
severity?: AllergySeverity;

  @IsOptional()
  @IsString()
  reaction?: string;

 @IsOptional()
@IsDateString()
onsetDate?: string;

@IsOptional()
@IsDateString()
lastReaction?: string;

@IsOptional()
@IsBoolean()
verified?: boolean;

@IsOptional()
@IsString()
verifiedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}