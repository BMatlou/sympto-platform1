import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationChannel, NotificationType } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationPreferencesService } from '../notification-preferences/notification-preferences.service';
import { NotificationsService } from './notifications.service';

class UpdatePatientNotificationPreferenceDto {
  @IsEnum(NotificationType)
  notificationType!: NotificationType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string | null;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string | null;
}

@Controller('patient-notifications')
@UseGuards(JwtAuthGuard)
export class PatientNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get('preferences')
  preferences(@Req() req: any) {
    return this.notificationPreferencesService.findForUser(req.user.sub);
  }

  @Patch('preferences')
  updatePreference(
    @Req() req: any,
    @Body() dto: UpdatePatientNotificationPreferenceDto,
  ) {
    return this.notificationPreferencesService.upsertForUser(
      req.user.sub,
      dto,
    );
  }

  @Get()
  mine(
    @Req() req: any,
    @Query('page') pageValue?: string,
    @Query('limit') limitValue?: string,
    @Query('unreadOnly') unreadOnlyValue?: string,
  ) {
    const page = Math.max(1, Number.parseInt(pageValue ?? '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(limitValue ?? '50', 10) || 50),
    );
    const unreadOnly = unreadOnlyValue === 'true';

    return this.notificationsService.findForUser(
      req.user.sub,
      page,
      limit,
      unreadOnly,
    );
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllReadForUser(req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markReadForUser(req.user.sub, id);
  }
}
