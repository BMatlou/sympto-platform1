import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AllergySeverity,
  AllergyStatus,
} from '@prisma/client';

export class PatientAllergyItemDto {
  @IsUUID()
  allergyId!: string;

  @IsOptional()
  @IsEnum(AllergySeverity)
  severity?: AllergySeverity;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reaction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reactionNotes?: string;

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
  @MaxLength(255)
  verifiedBy?: string;

  @IsOptional()
  @IsEnum(AllergyStatus)
  status?: AllergyStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdatePatientAllergiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAllergyItemDto)
  allergies!: PatientAllergyItemDto[];
}