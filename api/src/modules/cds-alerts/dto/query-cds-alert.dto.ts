import { CDSSeverity } from '@prisma/client';

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class QueryCdsAlertDto {
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
  clinicalDecisionSupportId?: string;

  @IsOptional()
  @IsEnum(CDSSeverity)
  severity?: CDSSeverity;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  acknowledged?: boolean;
}