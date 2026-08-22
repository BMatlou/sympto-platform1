import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import {
  PractitionerStatus,
  PractitionerType,
} from '@prisma/client';

export class CreatePractitionerDto {
  @IsUUID()
  personId!: string;

  @IsUUID()
  userId!: string;

  @IsString()
  registrationNumber!: string;

  @IsOptional()
  @IsString()
  practiceNumber?: string;

  @IsEnum(PractitionerType)
  practitionerType!: PractitionerType;

  @IsOptional()
  @IsEnum(PractitionerStatus)
  status?: PractitionerStatus;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}