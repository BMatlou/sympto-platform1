import {
  AppointmentType,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  practitionerId!: string;

  @IsOptional()
  @IsUUID()
  practiceId?: string;

  @IsEnum(AppointmentType)
  appointmentType!: AppointmentType;

  @IsDateString()
  scheduledStart!: Date;

  @IsDateString()
  scheduledEnd!: Date;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}