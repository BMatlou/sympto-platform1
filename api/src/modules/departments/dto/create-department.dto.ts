import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { DepartmentType } from '@prisma/client';

export class CreateDepartmentDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  name!: string;

  @IsEnum(DepartmentType)
  type!: DepartmentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}