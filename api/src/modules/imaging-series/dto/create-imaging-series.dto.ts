import { ImagingModality } from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateImagingSeriesDto {
  @IsUUID()
  studyId!: string;

  @IsString()
  seriesInstanceUID!: string;

  @IsEnum(ImagingModality)
  modality!: ImagingModality;

  @IsOptional()
  @IsString()
  description?: string;
}