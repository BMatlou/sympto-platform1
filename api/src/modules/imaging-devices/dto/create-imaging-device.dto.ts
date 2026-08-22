import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { ImagingModality } from '@prisma/client';

export class CreateImagingDeviceDto {
  @IsUUID()
  imagingCenterId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(ImagingModality)
  modality!: ImagingModality;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}