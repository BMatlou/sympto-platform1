import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  IsEnum,
} from 'class-validator';

import { Type } from 'class-transformer';
import { ConditionStatus } from '@prisma/client';

export class QueryPatientConditionDto {
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
  healthPassportId?: string;

  @IsOptional()
  @IsUUID()
  conditionId?: string;

 @IsOptional()
@IsEnum(ConditionStatus)
status?: ConditionStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  chronic?: boolean;
}