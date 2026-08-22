import {
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class QueryLabQualityControlDto {
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
  instrumentId?: string;

  @IsOptional()
  @IsUUID()
  testId?: string;
}