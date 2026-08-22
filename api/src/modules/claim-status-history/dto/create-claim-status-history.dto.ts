import { ClaimStatus } from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClaimStatusHistoryDto {
  @IsUUID()
  claimId!: string;

  @IsEnum(ClaimStatus)
  status!: ClaimStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}