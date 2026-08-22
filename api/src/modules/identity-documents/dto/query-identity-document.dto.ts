import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';
import { IdentityDocumentType } from '@prisma/client';

export class QueryIdentityDocumentDto {
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
  patientId?: string;

  @IsOptional()
  @IsUUID()
  issuingCountryId?: string;

  @IsOptional()
  @IsEnum(IdentityDocumentType)
  type?: IdentityDocumentType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verified?: boolean;
}