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

import { NotificationDeliveriesService } from './notification-deliveries.service';

import { CreateNotificationDeliveryDto } from './dto/create-notification-delivery.dto';
import { UpdateNotificationDeliveryDto } from './dto/update-notification-delivery.dto';
import { QueryNotificationDeliveryDto } from './dto/query-notification-delivery.dto';

@ApiTags('Notification Deliveries')
@ApiBearerAuth()
@Controller('notification-deliveries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationDeliveriesController {
  constructor(
    private readonly notificationDeliveriesService: NotificationDeliveriesService,
  ) {}

  @Permissions('notification-delivery.create')
  @Post()
  create(
    @Body() dto: CreateNotificationDeliveryDto,
  ) {
    return this.notificationDeliveriesService.create(
      dto,
    );
  }

  @Permissions('notification-delivery.read')
  @Get()
  findAll(
    @Query() query: QueryNotificationDeliveryDto,
  ) {
    return this.notificationDeliveriesService.findAll(
      query,
    );
  }

  @Permissions('notification-delivery.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.notificationDeliveriesService.findOne(
      id,
    );
  }

  @Permissions('notification-delivery.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationDeliveryDto,
  ) {
    return this.notificationDeliveriesService.update(
      id,
      dto,
    );
  }

  @Permissions('notification-delivery.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.notificationDeliveriesService.remove(
      id,
    );
  }
}