import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { LabDisciplineType } from '@prisma/client';

export class CreateLabDisciplineDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(LabDisciplineType)
  type!: LabDisciplineType;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}