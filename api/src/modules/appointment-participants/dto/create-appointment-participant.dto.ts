import {
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentParticipantDto {
  @IsUUID()
  appointmentId!: string;

  @IsUUID()
  personId!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;
}