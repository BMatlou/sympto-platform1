import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateConsentDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  grantedToUserId?: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsBoolean()
  granted?: boolean;

  @IsOptional()
  @IsDateString()
  grantedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsDateString()
  revokedAt?: string;
}