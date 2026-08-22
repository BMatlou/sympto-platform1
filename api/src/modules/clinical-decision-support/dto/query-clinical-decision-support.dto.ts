import {
  CDSSeverity,
  CDSStatus,
} from '@prisma/client';

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class QueryClinicalDecisionSupportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsEnum(CDSStatus)
  status?: CDSStatus;

  @IsOptional()
  @IsEnum(CDSSeverity)
  severity?: CDSSeverity;

  @IsOptional()
  @IsString()
  search?: string;
}