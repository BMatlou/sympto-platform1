import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  ParticipantRole,
  ParticipantStatus,
} from '@prisma/client';

export class QueryTelemedicineParticipantDto {
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
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole;

  @IsOptional()
  @IsEnum(ParticipantStatus)
  status?: ParticipantStatus;
}