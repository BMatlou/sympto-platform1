import {
  CarePlanTaskStatus,
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

export class QueryCarePlanTaskDto {
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
  carePlanId?: string;

  @IsOptional()
  @IsEnum(CarePlanTaskStatus)
  status?: CarePlanTaskStatus;

  @IsOptional()
  @IsString()
  search?: string;
}