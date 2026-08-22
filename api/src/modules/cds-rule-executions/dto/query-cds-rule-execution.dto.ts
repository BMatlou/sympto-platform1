import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class QueryCdsRuleExecutionDto {
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
  ruleId?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  triggered?: boolean;
}