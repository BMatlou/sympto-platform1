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

import { ImagingReportsService } from './imaging-reports.service';

import { CreateImagingReportDto } from './dto/create-imaging-report.dto';
import { UpdateImagingReportDto } from './dto/update-imaging-report.dto';
import { QueryImagingReportDto } from './dto/query-imaging-report.dto';

@ApiTags('Imaging Reports')
@ApiBearerAuth()
@Controller('imaging-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingReportsController {
  constructor(
    private readonly imagingReportsService: ImagingReportsService,
  ) {}

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingReportDto,
  ) {
    return this.imagingReportsService.create(dto);
  }

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingReportDto,
  ) {
    return this.imagingReportsService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingReportsService.findOne(id);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingReportDto,
  ) {
    return this.imagingReportsService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingReportsService.remove(id);
  }
}