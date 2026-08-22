import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClaimDocumentDto {
  @IsUUID()
  claimId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}