import { CarePlanGoalStatus } from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCarePlanGoalDto {
  @IsUUID()
  carePlanId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @IsString()
  currentValue?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(CarePlanGoalStatus)
  status?: CarePlanGoalStatus;
}