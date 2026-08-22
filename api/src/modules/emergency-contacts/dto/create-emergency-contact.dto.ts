import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from 'class-validator';

import { RelationshipType } from '@prisma/client';

export class CreateEmergencyContactDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  fullName!: string;

  @IsEnum(RelationshipType)
  relationship!: RelationshipType;

  @IsPhoneNumber()
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}