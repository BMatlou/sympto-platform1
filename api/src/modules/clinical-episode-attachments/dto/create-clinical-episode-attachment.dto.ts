import {
  ClinicalEpisodeAttachmentType,
} from '@prisma/client';

import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClinicalEpisodeAttachmentDto {
  @IsUUID()
  clinicalEpisodeId!: string;

  @IsUUID()
  attachmentId!: string;

  @IsEnum(
    ClinicalEpisodeAttachmentType,
  )
  type!: ClinicalEpisodeAttachmentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}