import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PrescriptionFrequency,
  PrescriptionRoute,
} from '@prisma/client';

export class SmartFilePrescriptionDto {
  @IsUUID()
  medicationId!: string;

  @IsString()
  dosage!: string;

  @IsEnum(PrescriptionFrequency)
  frequency!: PrescriptionFrequency;

  @IsEnum(PrescriptionRoute)
  route!: PrescriptionRoute;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  refills?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSmartFileClinicalUpdateDto {
  @IsOptional()
  @IsUUID()
  encounterTypeId?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  clinicalNote?: string;

  @IsOptional()
  @IsString()
  clinicalNoteTitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmartFilePrescriptionDto)
  prescription?: SmartFilePrescriptionDto;
}
