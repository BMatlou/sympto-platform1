import {
  HealthGoalCategory,
  HealthGoalPriority,
  HealthGoalStatus,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryHealthGoalDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsUUID()
  carePlanId?: string;

  @IsOptional()
  @IsEnum(HealthGoalCategory)
  category?: HealthGoalCategory;

  @IsOptional()
  @IsEnum(HealthGoalPriority)
  priority?: HealthGoalPriority;

  @IsOptional()
  @IsEnum(HealthGoalStatus)
  status?: HealthGoalStatus;
}