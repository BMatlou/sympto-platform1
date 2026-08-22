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

import { NotificationsService } from './notifications.service';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Permissions('notification.create')
  @Post()
  create(
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(dto);
  }

  @Permissions('notification.read')
  @Get()
  findAll(
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationsService.findAll(query);
  }

  @Permissions('notification.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.notificationsService.findOne(id);
  }

  @Permissions('notification.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(
      id,
      dto,
    );
  }

  @Permissions('notification.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.notificationsService.remove(id);
  }
}