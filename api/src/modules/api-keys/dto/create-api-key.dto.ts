import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  name!: string;

  @IsString()
  keyHash!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsOptional()
  @IsDateString()
  lastUsedAt?: Date;
}