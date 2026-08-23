import { IsDateString, IsEnum, IsOptional } from 'class-validator';

import { NotificationChannel } from '@prisma/client';

export class CreateMedicationReminderDto {
  @IsDateString()
  scheduledFor!: string;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}
