import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { RegisterPushSubscriptionDto } from './dto/register-push-subscription.dto';
import { PushNotificationService } from './push-notification.service';

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
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get('push/public-key')
  pushPublicKey() {
    return { publicKey: this.pushNotificationService.getPublicKey() };
  }

  @Post('push-subscription')
  registerPushSubscription(
    @Req() req: any,
    @Body() dto: RegisterPushSubscriptionDto,
  ) {
    let subscription: unknown;

    try {
      subscription = JSON.parse(dto.subscription);
    } catch {
      throw new BadRequestException('Invalid push subscription payload.');
    }

    if (!subscription || typeof subscription !== 'object') {
      throw new BadRequestException('Invalid push subscription payload.');
    }

    return this.pushNotificationService.registerSubscription(
      req.user.sub,
      subscription as any,
    );
  }

  @Get('preferences')
  preferences(@Req() req: any) {
    return this.notificationPreferencesService.findForUser(req.user.sub);
  }

  @Patch('preferences')
  updatePreference(
    @Req() req: any,
    @Body() dto: UpdatePatientNotificationPreferenceDto,
  ) {
    const supportedChannels: readonly NotificationChannel[] = [
      NotificationChannel.IN_APP,
      NotificationChannel.PUSH,
    ];

    if (!supportedChannels.includes(dto.channel)) {
      throw new BadRequestException(
        'This notification channel is not available yet.',
      );
    }

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

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCountForUser(req.user.sub);
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
