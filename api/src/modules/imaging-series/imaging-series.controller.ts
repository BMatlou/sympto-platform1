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

import { ImagingSeriesService } from './imaging-series.service';

import { CreateImagingSeriesDto } from './dto/create-imaging-series.dto';
import { UpdateImagingSeriesDto } from './dto/update-imaging-series.dto';
import { QueryImagingSeriesDto } from './dto/query-imaging-series.dto';

@ApiTags('Imaging Series')
@ApiBearerAuth()
@Controller('imaging-series')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingSeriesController {
  constructor(
    private readonly imagingSeriesService: ImagingSeriesService,
  ) {}

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingSeriesDto,
  ) {
    return this.imagingSeriesService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingSeriesService.findOne(id);
  }

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingSeriesDto,
  ) {
    return this.imagingSeriesService.create(dto);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingSeriesDto,
  ) {
    return this.imagingSeriesService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingSeriesService.remove(id);
  }
}