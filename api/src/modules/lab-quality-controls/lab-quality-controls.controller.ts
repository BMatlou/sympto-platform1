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

import { LabQualityControlsService } from './lab-quality-controls.service';

import { CreateLabQualityControlDto } from './dto/create-lab-quality-control.dto';
import { UpdateLabQualityControlDto } from './dto/update-lab-quality-control.dto';
import { QueryLabQualityControlDto } from './dto/query-lab-quality-control.dto';

@ApiTags('Lab Quality Controls')
@ApiBearerAuth()
@Controller('lab-quality-controls')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabQualityControlsController {
  constructor(
    private readonly labQualityControlsService: LabQualityControlsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabQualityControlDto,
  ) {
    return this.labQualityControlsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabQualityControlDto,
  ) {
    return this.labQualityControlsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labQualityControlsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabQualityControlDto,
  ) {
    return this.labQualityControlsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labQualityControlsService.remove(id);
  }
}