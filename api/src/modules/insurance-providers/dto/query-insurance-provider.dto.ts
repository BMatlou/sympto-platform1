import {
  InsuranceType,
} from '@prisma/client';

import { Type } from 'class-transformer';

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryInsuranceProviderDto {
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
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InsuranceType)
  type?: InsuranceType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}