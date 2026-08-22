import {
  HealthGoalCategory,
  HealthGoalPriority,
  HealthGoalStatus,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateHealthGoalDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  carePlanId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(HealthGoalCategory)
  category!: HealthGoalCategory;

  @IsOptional()
  @IsEnum(HealthGoalPriority)
  priority?: HealthGoalPriority;

  @IsOptional()
  @IsEnum(HealthGoalStatus)
  status?: HealthGoalStatus;

  @IsOptional()
  @IsNumberString()
  targetValue?: string;

  @IsOptional()
  @IsNumberString()
  currentValue?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsDateString()
  achievedAt?: string;
}