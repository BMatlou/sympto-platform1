import {
  HealthGoalProgressStatus,
} from '@prisma/client';

import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from '../../../common/dto/base-query.dto';

export class QueryHealthGoalProgressDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  healthGoalId?: string;

  @IsOptional()
  @IsEnum(
    HealthGoalProgressStatus,
  )
  status?: HealthGoalProgressStatus;
}