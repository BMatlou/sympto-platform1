import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { ImagingModality } from '@prisma/client';

export class CreateImagingProcedureDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(ImagingModality)
  modality!: ImagingModality;

  @IsOptional()
  @IsString()
  loincCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}