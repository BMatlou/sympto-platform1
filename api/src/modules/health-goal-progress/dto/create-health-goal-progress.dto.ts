import {
  HealthGoalProgressStatus,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateHealthGoalProgressDto {
  @IsUUID()
  healthGoalId!: string;

  @IsOptional()
  @IsNumberString()
  currentValue?: string;

  @IsOptional()
  @IsNumberString()
  progressPercent?: string;

  @IsEnum(
    HealthGoalProgressStatus,
  )
  status!: HealthGoalProgressStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  measuredAt!: string;
}