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

import { ImagingStudiesService } from './imaging-studies.service';

import { CreateImagingStudyDto } from './dto/create-imaging-study.dto';
import { UpdateImagingStudyDto } from './dto/update-imaging-study.dto';
import { QueryImagingStudyDto } from './dto/query-imaging-study.dto';

@ApiTags('Imaging Studies')
@ApiBearerAuth()
@Controller('imaging-studies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingStudiesController {
  constructor(
    private readonly imagingStudiesService: ImagingStudiesService,
  ) {}

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingStudyDto,
  ) {
    return this.imagingStudiesService.create(dto);
  }

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingStudyDto,
  ) {
    return this.imagingStudiesService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingStudiesService.findOne(id);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingStudyDto,
  ) {
    return this.imagingStudiesService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingStudiesService.remove(id);
  }
}