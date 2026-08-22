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

import { LabCalibrationsService } from './lab-calibrations.service';

import { CreateLabCalibrationDto } from './dto/create-lab-calibration.dto';
import { UpdateLabCalibrationDto } from './dto/update-lab-calibration.dto';
import { QueryLabCalibrationDto } from './dto/query-lab-calibration.dto';

@ApiTags('Lab Calibrations')
@ApiBearerAuth()
@Controller('lab-calibrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabCalibrationsController {
  constructor(
    private readonly labCalibrationsService: LabCalibrationsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabCalibrationDto,
  ) {
    return this.labCalibrationsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabCalibrationDto,
  ) {
    return this.labCalibrationsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labCalibrationsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabCalibrationDto,
  ) {
    return this.labCalibrationsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labCalibrationsService.remove(id);
  }
}