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

import { ImagingOrdersService } from './imaging-orders.service';

import { CreateImagingOrderDto } from './dto/create-imaging-order.dto';
import { UpdateImagingOrderDto } from './dto/update-imaging-order.dto';
import { QueryImagingOrderDto } from './dto/query-imaging-order.dto';

@ApiTags('Imaging Orders')
@ApiBearerAuth()
@Controller('imaging-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImagingOrdersController {
  constructor(
    private readonly imagingOrdersService: ImagingOrdersService,
  ) {}

  @Permissions('imaging.create')
  @Post()
  create(
    @Body() dto: CreateImagingOrderDto,
  ) {
    return this.imagingOrdersService.create(dto);
  }

  @Permissions('imaging.read')
  @Get()
  findAll(
    @Query() query: QueryImagingOrderDto,
  ) {
    return this.imagingOrdersService.findAll(query);
  }

  @Permissions('imaging.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.imagingOrdersService.findOne(id);
  }

  @Permissions('imaging.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImagingOrderDto,
  ) {
    return this.imagingOrdersService.update(id, dto);
  }

  @Permissions('imaging.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.imagingOrdersService.remove(id);
  }
}