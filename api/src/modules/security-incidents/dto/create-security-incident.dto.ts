import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  SecurityIncidentSeverity,
  SecurityIncidentType,
} from '@prisma/client';

export class CreateSecurityIncidentDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SecurityIncidentType)
  type!: SecurityIncidentType;

  @IsEnum(SecurityIncidentSeverity)
  severity!: SecurityIncidentSeverity;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}