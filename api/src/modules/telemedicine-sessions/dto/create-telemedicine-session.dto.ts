import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  TelemedicineSessionStatus,
} from '@prisma/client';

export class CreateTelemedicineSessionDto {
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsString()
  meetingId!: string;

  @IsString()
  provider!: string;

  @IsString()
  joinUrl!: string;

  @IsOptional()
  @IsString()
  hostUrl?: string;

  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @IsOptional()
  @IsEnum(TelemedicineSessionStatus)
  status?: TelemedicineSessionStatus;

  @IsDateString()
  scheduledStart!: Date;

  @IsOptional()
  @IsDateString()
  scheduledEnd?: Date;

  @IsOptional()
  @IsDateString()
  actualStart?: Date;

  @IsOptional()
  @IsDateString()
  actualEnd?: Date;

  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  screenSharingEnabled?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}