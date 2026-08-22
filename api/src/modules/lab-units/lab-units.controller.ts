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

import { LabUnitsService } from './lab-units.service';

import { CreateLabUnitDto } from './dto/create-lab-unit.dto';
import { UpdateLabUnitDto } from './dto/update-lab-unit.dto';
import { QueryLabUnitDto } from './dto/query-lab-unit.dto';

@ApiTags('Lab Units')
@ApiBearerAuth()
@Controller('lab-units')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabUnitsController {
  constructor(
    private readonly labUnitsService: LabUnitsService,
  ) {}

  @Permissions('laboratory.create')
  @Post()
  create(
    @Body() dto: CreateLabUnitDto,
  ) {
    return this.labUnitsService.create(dto);
  }

  @Permissions('laboratory.read')
  @Get()
  findAll(
    @Query() query: QueryLabUnitDto,
  ) {
    return this.labUnitsService.findAll(query);
  }

  @Permissions('laboratory.read')
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.labUnitsService.findOne(id);
  }

  @Permissions('laboratory.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabUnitDto,
  ) {
    return this.labUnitsService.update(id, dto);
  }

  @Permissions('laboratory.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.labUnitsService.remove(id);
  }
}