import {
  CarePlanTaskStatus,
  CarePlanTaskType,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCarePlanTaskDto {
  @IsUUID()
  carePlanId!: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsEnum(CarePlanTaskType)
  type!: CarePlanTaskType;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsEnum(CarePlanTaskStatus)
  status?: CarePlanTaskStatus;
}