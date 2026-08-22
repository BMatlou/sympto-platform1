import { CoverageType } from '@prisma/client';

import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInsuranceBenefitDto {
  @IsUUID()
  insurancePolicyId!: string;

  @IsEnum(CoverageType)
  coverageType!: CoverageType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumberString()
  annualLimit?: string;

  @IsOptional()
  @IsNumberString()
  coPayment?: string;

  @IsOptional()
  @IsNumberString()
  deductible?: string;
}