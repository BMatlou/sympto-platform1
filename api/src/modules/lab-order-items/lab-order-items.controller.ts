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

import { LabOrderItemsService } from './lab-order-items.service';

import { CreateLabOrderItemDto } from './dto/create-lab-order-item.dto';
import { UpdateLabOrderItemDto } from './dto/update-lab-order-item.dto';
import { QueryLabOrderItemDto } from './dto/query-lab-order-item.dto';

@ApiTags('Lab Order Items')
@ApiBearerAuth()
@Controller('lab-order-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabOrderItemsController {
  constructor(
    private readonly labOrderItemsService: LabOrderItemsService,
  ) {}

  @Permissions('lab-orders.create')
  @Post()
  create(
    @Body() dto: CreateLabOrderItemDto,
  ) {
    return this.labOrderItemsService.create(dto);
  }

  @Permissions('lab-orders.read')
  @Get()
  findAll(
    @Query() query: QueryLabOrderItemDto,
  ) {
    return this.labOrderItemsService.findAll(query);
  }

  @Permissions('lab-orders.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labOrderItemsService.findOne(id);
  }

  @Permissions('lab-orders.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabOrderItemDto,
  ) {
    return this.labOrderItemsService.update(id, dto);
  }

  @Permissions('lab-orders.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labOrderItemsService.remove(id);
  }
}