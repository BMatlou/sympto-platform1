import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { LabResultType } from '@prisma/client';

export class CreateLabTestDto {
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  methodId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  loincCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(LabResultType)
  resultType!: LabResultType;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}