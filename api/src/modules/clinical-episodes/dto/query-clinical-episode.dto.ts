import {
  ClinicalEpisodeStatus,
  ClinicalEpisodeType,
  EpisodePriority,
} from '@prisma/client';

import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryClinicalEpisodeDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsEnum(ClinicalEpisodeType)
  type?: ClinicalEpisodeType;

  @IsOptional()
  @IsEnum(ClinicalEpisodeStatus)
  status?: ClinicalEpisodeStatus;

  @IsOptional()
  @IsEnum(EpisodePriority)
  priority?: EpisodePriority;
}