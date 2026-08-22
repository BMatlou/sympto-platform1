import { CoverageType } from '@prisma/client';

import { Type } from 'class-transformer';

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class QueryInsuranceBenefitDto {
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
  insurancePolicyId?: string;

  @IsOptional()
  @IsEnum(CoverageType)
  coverageType?: CoverageType;
}