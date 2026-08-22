import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTelemedicineConsentDto {
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  patientId!: string;

  @IsBoolean()
  consented!: boolean;

  @IsOptional()
  @IsDateString()
  consentedAt?: Date;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}