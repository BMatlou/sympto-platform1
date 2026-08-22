import {
  PublicHealthPriority,
  PublicHealthReportStatus,
  PublicHealthReportType,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePublicHealthReportDto {
  @IsString()
  reportNumber!: string;

  @IsEnum(PublicHealthReportType)
  reportType!: PublicHealthReportType;

  @IsOptional()
  @IsEnum(PublicHealthReportStatus)
  status?: PublicHealthReportStatus;

  @IsOptional()
  @IsEnum(PublicHealthPriority)
  priority?: PublicHealthPriority;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  diseaseCode?: string;

  @IsOptional()
  @IsString()
  diseaseName?: string;

  @IsObject()
  reportData!: Record<string, any>;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @IsOptional()
  @IsDateString()
  acknowledgedAt?: string;
}