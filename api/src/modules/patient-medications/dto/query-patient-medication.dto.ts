import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  IsEnum,
} from 'class-validator';
import { MedicationStatus } from '@prisma/client';

import { Type } from 'class-transformer';

export class QueryPatientMedicationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsUUID()
  healthPassportId?: string;

  @IsOptional()
  @IsUUID()
  medicationId?: string;

  @IsOptional()
@IsEnum(MedicationStatus)
status?: MedicationStatus;
}