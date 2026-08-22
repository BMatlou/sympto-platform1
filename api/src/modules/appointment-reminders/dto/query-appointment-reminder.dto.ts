import { Type } from 'class-transformer';

import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class QueryAppointmentReminderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sent?: boolean;
}