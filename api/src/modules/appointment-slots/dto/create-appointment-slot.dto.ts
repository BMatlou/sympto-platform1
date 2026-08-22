import { AvailabilityStatus } from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentSlotDto {
  @IsUUID()
  availabilityId!: string;

  @IsDateString()
  start!: Date;

  @IsDateString()
  end!: Date;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  status?: AvailabilityStatus;
}