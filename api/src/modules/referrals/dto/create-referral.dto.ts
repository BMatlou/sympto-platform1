import {
  ReferralPriority,
  ReferralStatus,
  ReferralType,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateReferralDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  referringPractitionerId!: string;

  @IsOptional()
  @IsUUID()
  receivingPractitionerId?: string;

  @IsOptional()
  @IsUUID()
  referringPracticeId?: string;

  @IsOptional()
  @IsUUID()
  receivingPracticeId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsString()
  referralNumber!: string;

  @IsEnum(ReferralType)
  type!: ReferralType;

  @IsOptional()
  @IsEnum(ReferralPriority)
  priority?: ReferralPriority;

  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  clinicalSummary?: string;

  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @IsOptional()
  @IsDateString()
  acceptedDate?: string;

  @IsOptional()
  @IsDateString()
  completedDate?: string;
}