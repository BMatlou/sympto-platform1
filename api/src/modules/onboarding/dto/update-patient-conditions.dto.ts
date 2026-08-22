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

import {
  ConditionSeverity,
  ConditionStatus,
} from '@prisma/client';

import { Type } from 'class-transformer';

export class PatientConditionItemDto {
  @IsUUID()
  conditionId!: string;

  @IsOptional()
  @IsDateString()
  diagnosedAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsEnum(ConditionStatus)
  status?: ConditionStatus;

  @IsOptional()
  @IsEnum(ConditionSeverity)
  severity?: ConditionSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  stage?: string;

  @IsOptional()
  @IsBoolean()
  chronic?: boolean;

  @IsOptional()
  @IsBoolean()
  primaryCondition?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  diagnosedBy?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  outcome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdatePatientConditionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientConditionItemDto)
  conditions!: PatientConditionItemDto[];
}