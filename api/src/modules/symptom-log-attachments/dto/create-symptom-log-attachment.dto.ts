import {
  SymptomAttachmentCategory,
  SymptomAttachmentType,
} from '@prisma/client';

import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSymptomLogAttachmentDto {
  @IsUUID()
  symptomLogId!: string;

  @IsUUID()
  attachmentId!: string;

  @IsEnum(SymptomAttachmentType)
  type!: SymptomAttachmentType;

  @IsOptional()
  @IsEnum(SymptomAttachmentCategory)
  category?: SymptomAttachmentCategory;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}