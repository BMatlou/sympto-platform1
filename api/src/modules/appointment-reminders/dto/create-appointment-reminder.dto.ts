import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentReminderDto {
  @IsUUID()
  appointmentId!: string;

  @IsDateString()
  remindAt!: Date;

  @IsString()
  channel!: string;

  @IsOptional()
  @IsBoolean()
  sent?: boolean;
}