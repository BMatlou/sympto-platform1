import { Type } from 'class-transformer';

import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryPharmacyDto {
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
}