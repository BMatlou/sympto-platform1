import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  VerificationStatus,
  VerificationType,
} from '@prisma/client';

export class CreateVerificationRequestDto {
  @IsUUID()
  userId!: string;

  @IsEnum(VerificationType)
  type!: VerificationType;

  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @IsOptional()
  @IsString()
  reviewerNotes?: string;
}