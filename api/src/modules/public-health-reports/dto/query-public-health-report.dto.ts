import {
  PublicHealthPriority,
  PublicHealthReportStatus,
  PublicHealthReportType,
} from '@prisma/client';

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class QueryPublicHealthReportDto {
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
  @IsEnum(PublicHealthReportStatus)
  status?: PublicHealthReportStatus;

  @IsOptional()
  @IsEnum(PublicHealthPriority)
  priority?: PublicHealthPriority;

  @IsOptional()
  @IsEnum(PublicHealthReportType)
  reportType?: PublicHealthReportType;

  @IsOptional()
  @IsUUID()
  patientId?: string;
}