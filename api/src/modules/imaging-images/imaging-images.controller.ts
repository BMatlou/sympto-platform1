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

import { ImagingImagesService } from './imaging-images.service';

import { CreateImagingImageDto } from './dto/create-imaging-image.dto';
import { UpdateImagingImageDto } from './dto/update-imaging-image.dto';
import { QueryImagingImageDto } from './dto/query-imaging-image.dto';

@ApiTags('Imaging Images')
@ApiBearerAuth()
@Controller('imaging-images')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingImagesController {
  constructor(
    private readonly imagingImagesService: ImagingImagesService,
  ) {}

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingImageDto,
  ) {
    return this.imagingImagesService.create(dto);
  }

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingImageDto,
  ) {
    return this.imagingImagesService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingImagesService.findOne(id);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingImageDto,
  ) {
    return this.imagingImagesService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingImagesService.remove(id);
  }
}