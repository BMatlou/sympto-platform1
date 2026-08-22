import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDataAccessConsentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  grantedToUserId!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsOptional()
  @IsBoolean()
  canViewMedicalRecords?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewLabResults?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewImaging?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewPrescriptions?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewAppointments?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewAIReports?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewHealthPassport?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewWearables?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewInsurance?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewInvoices?: boolean;
}