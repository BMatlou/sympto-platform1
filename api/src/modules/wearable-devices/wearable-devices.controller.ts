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

import { WearableDevicesService } from './wearable-devices.service';

import { CreateWearableDeviceDto } from './dto/create-wearable-device.dto';
import { UpdateWearableDeviceDto } from './dto/update-wearable-device.dto';
import { QueryWearableDeviceDto } from './dto/query-wearable-device.dto';

@ApiTags('Wearable Devices')
@ApiBearerAuth()
@Controller('wearable-devices')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class WearableDevicesController {
  constructor(
    private readonly wearableDevicesService: WearableDevicesService,
  ) {}

  @Permissions('wearable-device.create')
  @Post()
  create(
    @Body()
    dto: CreateWearableDeviceDto,
  ) {
    return this.wearableDevicesService.create(dto);
  }

  @Permissions('wearable-device.read')
  @Get()
  findAll(
    @Query()
    query: QueryWearableDeviceDto,
  ) {
    return this.wearableDevicesService.findAll(query);
  }

  @Permissions('wearable-device.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.wearableDevicesService.findOne(id);
  }

  @Permissions('wearable-device.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateWearableDeviceDto,
  ) {
    return this.wearableDevicesService.update(
      id,
      dto,
    );
  }

  @Permissions('wearable-device.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.wearableDevicesService.remove(id);
  }
}