import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  NotificationChannel,
  NotificationType,
} from '@prisma/client';

export class CreateNotificationTemplateDto {
  @IsString()
  name!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}