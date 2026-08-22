/* update-health-goals.dto.ts */

import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  HealthGoalCategory,
  HealthGoalPriority,
  HealthGoalStatus,
} from '@prisma/client';

export class HealthGoalItemDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
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
  @IsNumber()
  targetValue?: number;

  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsDateString()
  achievedAt?: string;
}

export class UpdateHealthGoalsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HealthGoalItemDto)
  goals!: HealthGoalItemDto[];
}