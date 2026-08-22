import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { Type } from 'class-transformer';

import { ReferenceGender } from '@prisma/client';

export class CreateReferenceRangeDto {
  @IsUUID()
  testId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsEnum(ReferenceGender)
  gender?: ReferenceGender;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minimumAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maximumAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minimumValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maximumValue?: number;

  @IsOptional()
  @IsString()
  normalText?: string;
}