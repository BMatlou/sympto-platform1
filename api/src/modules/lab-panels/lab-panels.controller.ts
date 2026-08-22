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

import { LabPanelsService } from './lab-panels.service';

import { CreateLabPanelDto } from './dto/create-lab-panel.dto';
import { UpdateLabPanelDto } from './dto/update-lab-panel.dto';
import { QueryLabPanelDto } from './dto/query-lab-panel.dto';

@ApiTags('Lab Panels')
@ApiBearerAuth()
@Controller('lab-panels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabPanelsController {
  constructor(
    private readonly labPanelsService: LabPanelsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabPanelDto,
  ) {
    return this.labPanelsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabPanelDto,
  ) {
    return this.labPanelsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labPanelsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabPanelDto,
  ) {
    return this.labPanelsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labPanelsService.remove(id);
  }
}