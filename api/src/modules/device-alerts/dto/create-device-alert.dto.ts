import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { AlertSeverity } from '@prisma/client';

export class CreateDeviceAlertDto {
  @IsUUID()
  deviceId!: string;

  @IsOptional()
  @IsUUID()
  measurementId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @IsOptional()
  @IsDateString()
  acknowledgedAt?: Date;
}