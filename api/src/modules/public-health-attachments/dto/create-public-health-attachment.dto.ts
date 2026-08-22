import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePublicHealthAttachmentDto {
  @IsUUID()
  reportId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}