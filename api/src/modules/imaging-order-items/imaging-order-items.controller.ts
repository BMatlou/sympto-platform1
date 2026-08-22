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

import { ImagingOrderItemsService } from './imaging-order-items.service';

import { CreateImagingOrderItemDto } from './dto/create-imaging-order-item.dto';
import { UpdateImagingOrderItemDto } from './dto/update-imaging-order-item.dto';
import { QueryImagingOrderItemDto } from './dto/query-imaging-order-item.dto';

@ApiTags('Imaging Order Items')
@ApiBearerAuth()
@Controller('imaging-order-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingOrderItemsController {
  constructor(
    private readonly imagingOrderItemsService: ImagingOrderItemsService,
  ) {}

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingOrderItemDto,
  ) {
    return this.imagingOrderItemsService.create(dto);
  }

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingOrderItemDto,
  ) {
    return this.imagingOrderItemsService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingOrderItemsService.findOne(id);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingOrderItemDto,
  ) {
    return this.imagingOrderItemsService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingOrderItemsService.remove(id);
  }
}