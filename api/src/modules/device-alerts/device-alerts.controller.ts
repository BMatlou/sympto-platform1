import {
  Body,
  Controller,
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

import { DeviceAlertsService } from './device-alerts.service';

import { CreateDeviceAlertDto } from './dto/create-device-alert.dto';
import { UpdateDeviceAlertDto } from './dto/update-device-alert.dto';
import { QueryDeviceAlertDto } from './dto/query-device-alert.dto';

@ApiTags('Device Alerts')
@ApiBearerAuth()
@Controller('device-alerts')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class DeviceAlertsController {
  constructor(
    private readonly deviceAlertsService: DeviceAlertsService,
  ) {}

  @Permissions('device-alert.create')
  @Post()
  create(
    @Body()
    dto: CreateDeviceAlertDto,
  ) {
    return this.deviceAlertsService.create(dto);
  }

  @Permissions('device-alert.read')
  @Get()
  findAll(
    @Query()
    query: QueryDeviceAlertDto,
  ) {
    return this.deviceAlertsService.findAll(query);
  }

  @Permissions('device-alert.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.deviceAlertsService.findOne(id);
  }

  @Permissions('device-alert.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateDeviceAlertDto,
  ) {
    return this.deviceAlertsService.update(
      id,
      dto,
    );
  }
}