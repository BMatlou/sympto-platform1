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

import { DeviceMeasurementsService } from './device-measurements.service';

import { CreateDeviceMeasurementDto } from './dto/create-device-measurement.dto';
import { UpdateDeviceMeasurementDto } from './dto/update-device-measurement.dto';
import { QueryDeviceMeasurementDto } from './dto/query-device-measurement.dto';

@ApiTags('Device Measurements')
@ApiBearerAuth()
@Controller('device-measurements')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class DeviceMeasurementsController {
  constructor(
    private readonly deviceMeasurementsService: DeviceMeasurementsService,
  ) {}

  @Permissions('device-measurement.create')
  @Post()
  create(
    @Body()
    dto: CreateDeviceMeasurementDto,
  ) {
    return this.deviceMeasurementsService.create(dto);
  }

  @Permissions('device-measurement.read')
  @Get()
  findAll(
    @Query()
    query: QueryDeviceMeasurementDto,
  ) {
    return this.deviceMeasurementsService.findAll(query);
  }

  @Permissions('device-measurement.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.deviceMeasurementsService.findOne(id);
  }

  @Permissions('device-measurement.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateDeviceMeasurementDto,
  ) {
    return this.deviceMeasurementsService.update(
      id,
      dto,
    );
  }

  @Permissions('device-measurement.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.deviceMeasurementsService.remove(id);
  }
}