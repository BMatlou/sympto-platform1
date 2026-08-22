import {
  ClinicalEpisodeStatus,
  ClinicalEpisodeType,
  EpisodePriority,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClinicalEpisodeDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ClinicalEpisodeType)
  type!: ClinicalEpisodeType;

  @IsOptional()
  @IsEnum(ClinicalEpisodeStatus)
  status?: ClinicalEpisodeStatus;

  @IsOptional()
  @IsEnum(EpisodePriority)
  priority?: EpisodePriority;

  @IsDateString()
  startedAt!: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}