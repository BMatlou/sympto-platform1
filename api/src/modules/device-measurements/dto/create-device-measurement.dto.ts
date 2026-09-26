import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { Type } from 'class-transformer';

import { MeasurementType } from '@prisma/client';

export class CreateDeviceMeasurementDto {
  @IsUUID()
  deviceId!: string;

  @IsEnum(MeasurementType)
  measurementType!: MeasurementType;

  @Type(() => Number)
  @IsNumber()
  value!: number;

  @IsString()
  unit!: string;

  @IsDateString()
  measuredAt!: Date;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @IsOptional()
  @IsString()
  metricKey?: string;

  @IsOptional()
  @IsNumber()
  secondaryValue?: number;

  @IsOptional()
  @IsString()
  secondaryUnit?: string;

  @IsOptional()
  @IsString()
  externalRecordId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}