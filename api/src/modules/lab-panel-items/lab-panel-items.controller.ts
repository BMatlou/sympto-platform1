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

import { LabPanelItemsService } from './lab-panel-items.service';

import { CreateLabPanelItemDto } from './dto/create-lab-panel-item.dto';
import { UpdateLabPanelItemDto } from './dto/update-lab-panel-item.dto';
import { QueryLabPanelItemDto } from './dto/query-lab-panel-item.dto';

@ApiTags('Lab Panel Items')
@ApiBearerAuth()
@Controller('lab-panel-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabPanelItemsController {
  constructor(
    private readonly labPanelItemsService: LabPanelItemsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabPanelItemDto,
  ) {
    return this.labPanelItemsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabPanelItemDto,
  ) {
    return this.labPanelItemsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labPanelItemsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabPanelItemDto,
  ) {
    return this.labPanelItemsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labPanelItemsService.remove(id);
  }
}