import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  TelemedicineSessionStatus,
} from '@prisma/client';

export class QueryTelemedicineSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsEnum(TelemedicineSessionStatus)
  status?: TelemedicineSessionStatus;

  @IsOptional()
  @IsString()
  provider?: string;
}