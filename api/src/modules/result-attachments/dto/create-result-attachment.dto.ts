import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateResultAttachmentDto {
  @IsUUID()
  resultId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}