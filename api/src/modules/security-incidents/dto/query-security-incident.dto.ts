import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  SecurityIncidentSeverity,
  SecurityIncidentType,
} from '@prisma/client';

export class QuerySecurityIncidentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(SecurityIncidentType)
  type?: SecurityIncidentType;

  @IsOptional()
  @IsEnum(SecurityIncidentSeverity)
  severity?: SecurityIncidentSeverity;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resolved?: boolean;
}