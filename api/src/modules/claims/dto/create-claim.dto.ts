import { ClaimStatus } from '@prisma/client';

import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClaimDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  invoiceId!: string;

  @IsString()
  claimNumber!: string;

  @IsOptional()
  @IsUUID()
  patientInsuranceId?: string;

  @IsOptional()
  @IsUUID()
  insurancePolicyId?: string;

  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @IsOptional()
  @IsNumberString()
  approvedAmount?: string;

  @IsOptional()
  @IsString()
  rejectedReason?: string;
}