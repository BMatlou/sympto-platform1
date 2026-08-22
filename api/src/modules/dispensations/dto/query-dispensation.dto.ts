import { Type } from 'class-transformer';

import {
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class QueryDispensationDto {
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
  pharmacyId?: string;

  @IsOptional()
  @IsUUID()
  prescriptionItemId?: string;
}