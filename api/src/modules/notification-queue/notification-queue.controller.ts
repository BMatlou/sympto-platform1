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

import { NotificationQueueService } from './notification-queue.service';

import { CreateNotificationQueueDto } from './dto/create-notification-queue.dto';
import { UpdateNotificationQueueDto } from './dto/update-notification-queue.dto';
import { QueryNotificationQueueDto } from './dto/query-notification-queue.dto';

@ApiTags('Notification Queue')
@ApiBearerAuth()
@Controller('notification-queue')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationQueueController {
  constructor(
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  @Permissions('notification-queue.create')
  @Post()
  create(
    @Body() dto: CreateNotificationQueueDto,
  ) {
    return this.notificationQueueService.create(
      dto,
    );
  }

  @Permissions('notification-queue.read')
  @Get()
  findAll(
    @Query() query: QueryNotificationQueueDto,
  ) {
    return this.notificationQueueService.findAll(
      query,
    );
  }

  @Permissions('notification-queue.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.notificationQueueService.findOne(
      id,
    );
  }

  @Permissions('notification-queue.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationQueueDto,
  ) {
    return this.notificationQueueService.update(
      id,
      dto,
    );
  }

  @Permissions('notification-queue.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.notificationQueueService.remove(
      id,
    );
  }
}