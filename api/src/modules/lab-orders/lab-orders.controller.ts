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

import { LabOrdersService } from './lab-orders.service';

import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderDto } from './dto/update-lab-order.dto';
import { QueryLabOrderDto } from './dto/query-lab-order.dto';

@ApiTags('Lab Orders')
@ApiBearerAuth()
@Controller('lab-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabOrdersController {
  constructor(
    private readonly labOrdersService: LabOrdersService,
  ) {}

  @Permissions('lab-orders.create')
  @Post()
  create(
    @Body() dto: CreateLabOrderDto,
  ) {
    return this.labOrdersService.create(dto);
  }

  @Permissions('lab-orders.read')
  @Get()
  findAll(
    @Query() query: QueryLabOrderDto,
  ) {
    return this.labOrdersService.findAll(query);
  }

  @Permissions('lab-orders.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labOrdersService.findOne(id);
  }

  @Permissions('lab-orders.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabOrderDto,
  ) {
    return this.labOrdersService.update(id, dto);
  }

  @Permissions('lab-orders.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labOrdersService.remove(id);
  }
}