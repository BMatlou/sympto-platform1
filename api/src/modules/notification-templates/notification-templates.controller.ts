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

import { NotificationTemplatesService } from './notification-templates.service';

import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { QueryNotificationTemplateDto } from './dto/query-notification-template.dto';

@ApiTags('Notification Templates')
@ApiBearerAuth()
@Controller('notification-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationTemplatesController {
  constructor(
    private readonly notificationTemplatesService: NotificationTemplatesService,
  ) {}

  @Permissions('notification-template.create')
  @Post()
  create(
    @Body() dto: CreateNotificationTemplateDto,
  ) {
    return this.notificationTemplatesService.create(
      dto,
    );
  }

  @Permissions('notification-template.read')
  @Get()
  findAll(
    @Query() query: QueryNotificationTemplateDto,
  ) {
    return this.notificationTemplatesService.findAll(
      query,
    );
  }

  @Permissions('notification-template.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.notificationTemplatesService.findOne(
      id,
    );
  }

  @Permissions('notification-template.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.notificationTemplatesService.update(
      id,
      dto,
    );
  }

  @Permissions('notification-template.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.notificationTemplatesService.remove(
      id,
    );
  }
}