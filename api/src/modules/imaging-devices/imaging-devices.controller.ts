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

import { ImagingDevicesService } from './imaging-devices.service';

import { CreateImagingDeviceDto } from './dto/create-imaging-device.dto';
import { UpdateImagingDeviceDto } from './dto/update-imaging-device.dto';
import { QueryImagingDeviceDto } from './dto/query-imaging-device.dto';

@ApiTags('Imaging Devices')
@ApiBearerAuth()
@Controller('imaging-devices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingDevicesController {
  constructor(
    private readonly imagingDevicesService: ImagingDevicesService,
  ) {}

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingDeviceDto,
  ) {
    return this.imagingDevicesService.create(dto);
  }

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingDeviceDto,
  ) {
    return this.imagingDevicesService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingDevicesService.findOne(id);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingDeviceDto,
  ) {
    return this.imagingDevicesService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingDevicesService.remove(id);
  }
}