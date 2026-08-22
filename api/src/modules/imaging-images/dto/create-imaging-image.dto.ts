import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateImagingImageDto {
  @IsUUID()
  seriesId!: string;

  @IsString()
  sopInstanceUID!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  imageNumber?: number;
}