import {
  SymptomAttachmentCategory,
  SymptomAttachmentType,
} from '@prisma/client';

import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QuerySymptomLogAttachmentDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  symptomLogId?: string;

  @IsOptional()
  @IsUUID()
  attachmentId?: string;

  @IsOptional()
  @IsEnum(SymptomAttachmentType)
  type?: SymptomAttachmentType;

  @IsOptional()
  @IsEnum(SymptomAttachmentCategory)
  category?: SymptomAttachmentCategory;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}