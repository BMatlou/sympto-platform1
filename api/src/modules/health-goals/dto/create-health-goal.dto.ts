import {
  HealthGoalCategory,
  HealthGoalPriority,
  HealthGoalStatus,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const GOAL_METRIC_TYPES = [
  'MEDICATION',
  'EXERCISE',
  'HYDRATION',
  'SMOKING_CESSATION',
] as const;

const GOAL_FREQUENCIES = [
  'DAILY',
  'WEEKLY',
  'TOTAL',
] as const;

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

  @IsOptional()
  @IsIn(GOAL_METRIC_TYPES)
  metricType?: (typeof GOAL_METRIC_TYPES)[number];

  @IsOptional()
  @IsString()
  metricKey?: string;

  @IsOptional()
  @IsIn(GOAL_FREQUENCIES)
  frequency?: (typeof GOAL_FREQUENCIES)[number];

  @IsOptional()
  @IsNumberString()
  frequencyTarget?: string;

  @IsOptional()
  @IsString()
  guidanceText?: string;
}
