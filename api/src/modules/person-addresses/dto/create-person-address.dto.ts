import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { AddressType } from '@prisma/client';

export class CreatePersonAddressDto {
  @IsUUID()
  personId!: string;

  @IsUUID()
  addressId!: string;

  @IsEnum(AddressType)
  type!: AddressType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}