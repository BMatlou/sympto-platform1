import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  SessionEventType,
} from '@prisma/client';

export class CreateTelemedicineEventDto {
  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(SessionEventType)
  type!: SessionEventType;

  @IsOptional()
  @IsString()
  description?: string;
}