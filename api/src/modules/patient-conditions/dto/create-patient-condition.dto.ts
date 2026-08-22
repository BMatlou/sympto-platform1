import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ConditionStatus } from '@prisma/client';

export class CreatePatientConditionDto {
  @IsUUID()
  healthPassportId!: string;

  @IsUUID()
  conditionId!: string;

  @IsOptional()
  @IsDateString()
  diagnosedAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsBoolean()
  chronic?: boolean;

  @IsOptional()
@IsEnum(ConditionStatus)
status?: ConditionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}