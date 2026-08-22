import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  NotificationChannel,
  NotificationType,
} from '@prisma/client';

export class CreateNotificationPreferenceDto {
  @IsUUID()
  userId!: string;

  @IsEnum(NotificationType)
  notificationType!: NotificationType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsUUID()
  notificationId?: string;
}