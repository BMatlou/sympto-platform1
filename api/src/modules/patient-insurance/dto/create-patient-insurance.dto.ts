import { RelationshipType } from '@prisma/client';

import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePatientInsuranceDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  insurancePolicyId!: string;

  @IsString()
  membershipNumber!: string;

  @IsOptional()
  @IsString()
  dependantCode?: string;

  @IsOptional()
  @IsString()
  principalMemberName?: string;

  @IsOptional()
  @IsEnum(RelationshipType)
  relationship?: RelationshipType;

  @IsDateString()
  effectiveFrom!: Date;

  @IsOptional()
  @IsDateString()
  effectiveTo?: Date;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}