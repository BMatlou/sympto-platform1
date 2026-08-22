import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  VerificationStatus,
  VerificationType,
} from '@prisma/client';

export class QueryVerificationRequestDto {
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
  userId?: string;

  @IsOptional()
  @IsEnum(VerificationType)
  type?: VerificationType;

  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;
}