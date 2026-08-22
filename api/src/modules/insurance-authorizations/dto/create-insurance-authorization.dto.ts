import { AuthorizationStatus } from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInsuranceAuthorizationDto {
  @IsUUID()
  patientInsuranceId!: string;

  @IsString()
  authorizationNumber!: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsEnum(AuthorizationStatus)
  status?: AuthorizationStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumberString()
  approvedAmount?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: Date;

  @IsOptional()
  @IsDateString()
  validTo?: Date;
}