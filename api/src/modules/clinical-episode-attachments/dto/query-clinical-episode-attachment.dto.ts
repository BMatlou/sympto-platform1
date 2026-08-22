import {
  ClinicalEpisodeAttachmentType,
} from '@prisma/client';

import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryClinicalEpisodeAttachmentDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  clinicalEpisodeId?: string;

  @IsOptional()
  @IsUUID()
  attachmentId?: string;

  @IsOptional()
  @IsEnum(
    ClinicalEpisodeAttachmentType,
  )
  type?: ClinicalEpisodeAttachmentType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}