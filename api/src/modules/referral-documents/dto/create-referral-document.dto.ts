import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateReferralDocumentDto {
  @IsUUID()
  referralId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}