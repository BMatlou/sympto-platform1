import {
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class UpdateConsentDto {
  /**
   * Required
   */
  @IsBoolean()
  acceptTerms!: boolean;

  @IsBoolean()
  acceptPrivacyPolicy!: boolean;

  @IsBoolean()
  acceptDataProcessing!: boolean;

  /**
   * Optional
   */
  @IsOptional()
  @IsBoolean()
  acceptMarketing?: boolean;
}