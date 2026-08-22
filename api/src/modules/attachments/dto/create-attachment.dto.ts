import {
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateAttachmentDto {
  @IsUUID()
  encounterId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsUrl()
  url!: string;
}