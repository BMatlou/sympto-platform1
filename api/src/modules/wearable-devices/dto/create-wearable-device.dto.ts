import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  DeviceStatus,
  DeviceType,
} from '@prisma/client';

export class CreateWearableDeviceDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  manufacturer!: string;

  @IsString()
  model!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsEnum(DeviceType)
  deviceType!: DeviceType;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @IsOptional()
  @IsDateString()
  lastSyncAt?: Date;
}