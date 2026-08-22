import { CDSSeverity } from '@prisma/client';

import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCdsAlertDto {
  @IsUUID()
  clinicalDecisionSupportId!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsEnum(CDSSeverity)
  severity!: CDSSeverity;

  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @IsOptional()
  @IsDateString()
  acknowledgedAt?: string;
}