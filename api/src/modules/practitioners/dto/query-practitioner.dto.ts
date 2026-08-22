import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  PractitionerStatus,
  PractitionerType,
} from '@prisma/client';

export class QueryPractitionerDto {
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
  departmentId?: string;

  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @IsOptional()
  @IsEnum(PractitionerStatus)
  status?: PractitionerStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}