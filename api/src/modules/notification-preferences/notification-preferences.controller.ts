import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { NotificationPreferencesService } from './notification-preferences.service';

import { CreateNotificationPreferenceDto } from './dto/create-notification-preference.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { QueryNotificationPreferenceDto } from './dto/query-notification-preference.dto';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@Controller('notification-preferences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Permissions('notification-preference.create')
  @Post()
  create(
    @Body() dto: CreateNotificationPreferenceDto,
  ) {
    return this.notificationPreferencesService.create(
      dto,
    );
  }

  @Permissions('notification-preference.read')
  @Get()
  findAll(
    @Query() query: QueryNotificationPreferenceDto,
  ) {
    return this.notificationPreferencesService.findAll(
      query,
    );
  }

  @Permissions('notification-preference.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.notificationPreferencesService.findOne(
      id,
    );
  }

  @Permissions('notification-preference.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationPreferencesService.update(
      id,
      dto,
    );
  }

  @Permissions('notification-preference.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.notificationPreferencesService.remove(
      id,
    );
  }
}