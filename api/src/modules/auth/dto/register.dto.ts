import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';
import { UserType } from '@prisma/client';

export class RegisterDto {
  @IsEnum(['INDIVIDUAL', 'PRACTITIONER', 'ORGANIZATION'])
  accountType!: 'INDIVIDUAL' | 'PRACTITIONER' | 'ORGANIZATION';

  @IsString()
  @Length(2, 100)
  firstName!: string;

  @IsString()
  @Length(2, 100)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  country!: string;

  @IsString()
  province!: string;

  @IsString()
  city!: string;

  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;

  @IsString()
  confirmPassword!: string;

  @IsBoolean()
  agreeTerms!: boolean;

  @IsBoolean()
  agreePrivacy!: boolean;

  @IsBoolean()
  agreePOPIA!: boolean;

  // Individual
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  // Practitioner
  @IsOptional()
  @IsString()
  medicalAuthority?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  practiceName?: string;

  // Organization
  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  organizationType?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEmail()
  organizationEmail?: string;

  @IsOptional()
  @IsString()
  organizationPhone?: string;

  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;
}