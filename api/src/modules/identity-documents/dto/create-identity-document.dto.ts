import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { IdentityDocumentType } from '@prisma/client';

export class CreateIdentityDocumentDto {
  @IsUUID()
  patientId!: string;

  @IsEnum(IdentityDocumentType)
  type!: IdentityDocumentType;

  @IsString()
  documentNumber!: string;

  @IsOptional()
  @IsUUID()
  issuingCountryId?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}