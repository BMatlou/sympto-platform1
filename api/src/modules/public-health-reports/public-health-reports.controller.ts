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

import { PublicHealthReportsService } from './public-health-reports.service';

import { CreatePublicHealthReportDto } from './dto/create-public-health-report.dto';
import { UpdatePublicHealthReportDto } from './dto/update-public-health-report.dto';
import { QueryPublicHealthReportDto } from './dto/query-public-health-report.dto';

@ApiTags('Public Health Reports')
@ApiBearerAuth()
@Controller('public-health-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PublicHealthReportsController {
  constructor(
    private readonly publicHealthReportsService: PublicHealthReportsService,
  ) {}

  @Permissions('public-health.create')
  @Post()
  create(@Body() dto: CreatePublicHealthReportDto) {
    return this.publicHealthReportsService.create(dto);
  }

  @Permissions('public-health.read')
  @Get()
  findAll(@Query() query: QueryPublicHealthReportDto) {
    return this.publicHealthReportsService.findAll(query);
  }

  @Permissions('public-health.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.publicHealthReportsService.findOne(id);
  }

  @Permissions('public-health.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePublicHealthReportDto,
  ) {
    return this.publicHealthReportsService.update(id, dto);
  }

  @Permissions('public-health.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.publicHealthReportsService.remove(id);
  }
}