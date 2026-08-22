import { InsuranceType } from '@prisma/client';
import { IsBoolean } from 'class-validator';

import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateInsuranceProviderDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(InsuranceType)
  type!: InsuranceType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}