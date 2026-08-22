import { AdjustmentType } from '@prisma/client';

import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateFinancialAdjustmentDto {
  @IsUUID()
  invoiceId!: string;

  @IsEnum(AdjustmentType)
  type!: AdjustmentType;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}