import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { Gender } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  /**
   * Persisted profile image source on Person.profileImageUrl.
   * The web client may send a data:image URL for locally selected images;
   * normal HTTPS image URLs remain supported for externally hosted images.
   */
  @IsOptional()
  @IsString()
  @MaxLength(7_000_000)
  @Matches(/^(https?:\/\/|data:image\/(?:png|jpeg|webp);base64,)/i, {
    message: 'Profile image must be an HTTPS image URL or a PNG/JPEG/WebP data image.',
  })
  profileImageUrl?: string;
}
