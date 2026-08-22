import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  LabOrderStatus,
  Priority,
} from '@prisma/client';

export class CreateLabOrderItemDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  testId!: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(LabOrderStatus)
  status?: LabOrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}