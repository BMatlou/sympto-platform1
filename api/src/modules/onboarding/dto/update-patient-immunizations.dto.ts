import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class PatientImmunizationItemDto {
  @IsUUID()
  immunizationId!: string;

  @IsOptional()
  @IsDateString()
  administeredAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  doseNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  administeredBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  facility?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  site?: string;

  @IsOptional()
  @IsBoolean()
  adverseReaction?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adverseReactionNotes?: string;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdatePatientImmunizationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientImmunizationItemDto)
  immunizations!: PatientImmunizationItemDto[];
}