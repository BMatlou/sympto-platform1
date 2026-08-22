import { PolicyStatus } from '@prisma/client';

import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInsurancePolicyDto {
  @IsUUID()
  providerId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @IsOptional()
  @IsNumberString()
  annualLimit?: string;

  @IsOptional()
  @IsNumberString()
  deductible?: string;

  @IsOptional()
  @IsNumberString()
  coPayment?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;
}