import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import {
  ParticipantRole,
  ParticipantStatus,
} from '@prisma/client';

export class CreateTelemedicineParticipantDto {
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  userId!: string;

  @IsEnum(ParticipantRole)
  role!: ParticipantRole;

  @IsOptional()
  @IsEnum(ParticipantStatus)
  status?: ParticipantStatus;

  @IsOptional()
  @IsDateString()
  joinedAt?: Date;

  @IsOptional()
  @IsDateString()
  leftAt?: Date;
}