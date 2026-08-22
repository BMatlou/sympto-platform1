import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { LabResultStatus } from '@prisma/client';

export class CreateLabResultDto {
  @IsUUID()
  specimenId!: string;

  @IsUUID()
  orderItemId!: string;

  @IsOptional()
  @IsEnum(LabResultStatus)
  status?: LabResultStatus;

  @IsOptional()
  @IsDateString()
  reportedAt?: string;

  @IsOptional()
  @IsDateString()
  releasedAt?: string;
}