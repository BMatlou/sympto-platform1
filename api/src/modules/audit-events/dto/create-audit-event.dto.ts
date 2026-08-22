import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { AuditSeverity } from '@prisma/client';

export class CreateAuditEventDto {
  @IsUUID()
  auditLogId!: string;

  @IsEnum(AuditSeverity)
  severity!: AuditSeverity;

  @IsString()
  event!: string;

  @IsOptional()
  @IsString()
  details?: string;
}