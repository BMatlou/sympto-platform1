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

import { ImagingCentersService } from './imaging-centers.service';

import { CreateImagingCenterDto } from './dto/create-imaging-center.dto';
import { UpdateImagingCenterDto } from './dto/update-imaging-center.dto';
import { QueryImagingCenterDto } from './dto/query-imaging-center.dto';

@ApiTags('Imaging Centers')
@ApiBearerAuth()
@Controller('imaging-centers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingCentersController {
  constructor(
    private readonly imagingCentersService: ImagingCentersService,
  ) {}

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingCenterDto,
  ) {
    return this.imagingCentersService.create(dto);
  }

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingCenterDto,
  ) {
    return this.imagingCentersService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingCentersService.findOne(id);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingCenterDto,
  ) {
    return this.imagingCentersService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingCentersService.remove(id);
  }
}