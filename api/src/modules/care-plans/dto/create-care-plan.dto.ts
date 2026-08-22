import { CarePlanStatus } from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCarePlanDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  practitionerId!: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CarePlanStatus)
  status?: CarePlanStatus;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}