import { ReferralStatus } from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateReferralStatusHistoryDto {
  @IsUUID()
  referralId!: string;

  @IsEnum(ReferralStatus)
  status!: ReferralStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}