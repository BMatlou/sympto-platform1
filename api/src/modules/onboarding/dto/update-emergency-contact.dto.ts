import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { RelationshipType } from '@prisma/client';

export class UpdateEmergencyContactDto {
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @IsEnum(RelationshipType)
  relationship!: RelationshipType;

  @IsString()
  @MaxLength(30)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = true;
}