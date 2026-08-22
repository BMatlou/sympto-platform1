import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { VerificationAction } from '@prisma/client';

export class CreateResultVerificationDto {
  @IsUUID()
  resultId!: string;

  @IsUUID()
  practitionerId!: string;

  @IsEnum(VerificationAction)
  action!: VerificationAction;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsDateString()
  verifiedAt?: string;
}